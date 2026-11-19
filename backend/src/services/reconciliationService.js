import * as billingModel from "../models/billingModel.js";
import * as ledgerModel from "../models/ledgerModel.js";
import * as flatModel from "../models/flatModel.js";
import { notifyUpiSubmitted, notifyPaymentVerified } from "./notificationService.js";
import { computeRowHash, GENESIS_HASH } from "../utils/ledgerHash.js";

/**
 * Submit a UPI UTR for a bill (resident self-report).
 */
export async function submitUtr({ billId, utr, amount, submittedBy, societyId = null }) {
  let targetSocId = societyId;
  const bill = await billingModel.findBillById(billId);
  if (bill && !targetSocId) {
    targetSocId = bill.society_id;
  }

  const recId = await billingModel.insertUpiReconciliation({
    societyId: targetSocId || 1,
    billId,
    utr,
    amount,
    submittedBy,
  });

  // Asynchronously notify treasurer & admins
  (async () => {
    try {
      const flat = bill?.flat_id ? await flatModel.findById(bill.flat_id) : null;
      const flatNumber = flat ? `Flat ${flat.wing}-${flat.number}` : `Bill #${billId}`;
      await notifyUpiSubmitted({
        societyId: targetSocId || 1,
        flatNumber,
        amount,
        utr,
        billId,
      });
    } catch {
      // Non-blocking notification
    }
  })();

  return recId;
}

/**
 * Treasurer verifies a UTR — marks bill PAID and creates a hash-chained CREDIT ledger entry scoped to the society.
 */
export async function verifyAndReconcile(reconciliationId, verifiedBy) {
  const rec = await billingModel.findUpiRecById(reconciliationId);
  if (!rec) throw Object.assign(new Error("Reconciliation record not found"), { status: 404 });
  if (rec.status !== "SUBMITTED") throw Object.assign(new Error("Already processed"), { status: 409 });

  const bill = await billingModel.findBillById(rec.bill_id);
  if (!bill) throw Object.assign(new Error("Bill not found"), { status: 404 });

  const societyId = bill.society_id || rec.society_id || 1;

  // 1. Mark UTR verified
  await billingModel.verifyUtr(reconciliationId, verifiedBy);

  // 2. Mark bill PAID
  await billingModel.updateBillStatus(bill.id, "PAID");

  // 3. Create hash-chained ledger CREDIT entry FOR THIS SOCIETY with atomic hash chaining
  const tx = await ledgerModel.appendTransaction({
    societyId,
    transactionType: "CREDIT",
    category: "MAINTENANCE",
    referenceType: "upi_reconciliation",
    referenceId: reconciliationId,
    description: `Maintenance payment verified — Bill #${bill.id}`,
    amount: Number(rec.amount),
    createdBy: verifiedBy,
  });

  // 4. Notify resident of receipt issuance
  if (rec.submitted_by) {
    try {
      const flatNumber =
        bill.wing && bill.flat_number ? `Flat ${bill.wing}-${bill.flat_number}` : `Bill #${bill.id}`;
      await notifyPaymentVerified({
        societyId,
        userId: rec.submitted_by,
        amount: rec.amount,
        billId: bill.id,
        flatNumber,
      });
    } catch {
      // Non-blocking notification failure
    }
  }

  return {
    ledgerId: tx.insertId,
    billId: bill.id,
    amount: rec.amount,
    balance: tx.balanceAfter,
    societyId,
  };
}
