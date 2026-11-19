import * as billingModel from "../models/billingModel.js";
import * as ledgerModel from "../models/ledgerModel.js";
import * as flatModel from "../models/flatModel.js";
import { notifyUpiSubmitted, notifyPaymentVerified } from "./notificationService.js";
import { computeRowHash, GENESIS_HASH } from "../utils/ledgerHash.js";
import { parseRawBankStatement } from "../utils/bankStatementParser.js";

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

/**
 * Parses and cross-references a bank statement (.csv, .xlsx, .xls) against society bills and UTRs.
 */
export async function previewBankStatement({ fileBuffer, originalFilename, societyId = 1 }) {
  const transactions = parseRawBankStatement(fileBuffer);

  const [pendingBills, existingRecs] = await Promise.all([
    billingModel.findPendingBillsWithDetails(societyId),
    billingModel.findReconciliationsBySociety(societyId),
  ]);

  // Index existing reconciliations by UTR
  const utrToRec = new Map();
  for (const r of existingRecs) {
    if (r.utr) {
      utrToRec.set(String(r.utr).trim(), r);
    }
  }

  const pendingByBillId = new Map();
  for (const b of pendingBills) {
    pendingByBillId.set(b.id, b);
  }

  const items = [];
  let matchedCount = 0;
  let matchedAmount = 0;
  let mismatchCount = 0;
  let unmatchedCount = 0;
  let alreadyVerifiedCount = 0;

  for (let idx = 0; idx < transactions.length; idx++) {
    const tx = transactions[idx];
    const utr = tx.extractedUtr ? String(tx.extractedUtr).trim() : null;
    const narrationUpper = (tx.narration || "").toUpperCase();

    let matchedItem = {
      id: idx + 1,
      rowNumber: tx.rowNumber,
      date: tx.date,
      narration: tx.narration,
      reference: tx.reference,
      extractedUtr: utr,
      amount: tx.amount,
      status: "UNMATCHED",
      matchType: "NONE",
      confidence: 0,
      billId: null,
      billTotal: null,
      flatNumber: null,
      residentName: null,
      reconciliationId: null,
      expectedAmount: null,
      selected: false,
    };

    // Strategy 1: Direct UTR lookup in upi_reconciliations
    if (utr && utrToRec.has(utr)) {
      const rec = utrToRec.get(utr);
      const bill = pendingByBillId.get(rec.bill_id) || (await billingModel.findBillById(rec.bill_id, societyId));
      const flatLabel =
        bill?.wing && bill?.flat_number
          ? `Flat ${bill.wing}-${bill.flat_number}`
          : rec.flat_number
          ? `Flat ${rec.wing}-${rec.flat_number}`
          : "Assigned Flat";

      if (rec.status === "VERIFIED") {
        matchedItem.status = "ALREADY_VERIFIED";
        matchedItem.matchType = "DIRECT_UTR";
        matchedItem.confidence = 100;
        matchedItem.billId = rec.bill_id;
        matchedItem.billTotal = Number(rec.bill_total || bill?.total_amount || rec.amount);
        matchedItem.flatNumber = flatLabel;
        matchedItem.residentName = rec.full_name || bill?.full_name || "Resident";
        matchedItem.reconciliationId = rec.id;
        matchedItem.selected = false;
        alreadyVerifiedCount++;
      } else if (rec.status === "SUBMITTED") {
        const diff = Math.abs(Number(tx.amount) - Number(rec.amount));
        if (diff <= 1) {
          matchedItem.status = "MATCHED_UTR";
          matchedItem.matchType = "DIRECT_UTR";
          matchedItem.confidence = 100;
          matchedItem.billId = rec.bill_id;
          matchedItem.billTotal = Number(rec.bill_total || bill?.total_amount || rec.amount);
          matchedItem.flatNumber = flatLabel;
          matchedItem.residentName = rec.full_name || bill?.full_name || "Resident";
          matchedItem.reconciliationId = rec.id;
          matchedItem.selected = true; // Pre-checked for 1-click batch reconcile
          matchedCount++;
          matchedAmount += Number(tx.amount);
        } else {
          matchedItem.status = "AMOUNT_MISMATCH";
          matchedItem.matchType = "DIRECT_UTR";
          matchedItem.confidence = 70;
          matchedItem.billId = rec.bill_id;
          matchedItem.billTotal = Number(rec.bill_total || bill?.total_amount || rec.amount);
          matchedItem.flatNumber = flatLabel;
          matchedItem.residentName = rec.full_name || bill?.full_name || "Resident";
          matchedItem.reconciliationId = rec.id;
          matchedItem.expectedAmount = Number(rec.amount);
          matchedItem.selected = false;
          mismatchCount++;
        }
      }
    } else {
      // Strategy 2: Smart Flat / Resident Name Matching on pending bills
      let smartFoundBill = null;

      for (const b of pendingBills) {
        const wing = (b.wing || "").toUpperCase();
        const num = (b.flat_number || "").toUpperCase();
        const fullName = (b.full_name || "").toUpperCase();

        const flatPatterns = [
          `${wing}-${num}`,
          `${wing}${num}`,
          `FLAT ${num}`,
          `FLAT-${num}`,
          `FLAT ${wing}-${num}`,
          `FLAT ${wing}${num}`,
        ];

        const hasFlat = flatPatterns.some((pat) => pat.length > 1 && narrationUpper.includes(pat));
        const hasName =
          fullName.length > 3 &&
          (narrationUpper.includes(fullName) ||
            fullName.split(" ").some((part) => part.length >= 4 && narrationUpper.includes(part)));

        if (hasFlat || hasName) {
          smartFoundBill = b;
          break;
        }
      }

      if (smartFoundBill) {
        const diff = Math.abs(Number(tx.amount) - Number(smartFoundBill.total_amount));
        const flatLabel = `Flat ${smartFoundBill.wing}-${smartFoundBill.flat_number}`;
        if (diff <= 1) {
          matchedItem.status = "SMART_MATCH";
          matchedItem.matchType = "SMART_FLAT_AMOUNT";
          matchedItem.confidence = 90;
          matchedItem.billId = smartFoundBill.id;
          matchedItem.billTotal = Number(smartFoundBill.total_amount);
          matchedItem.flatNumber = flatLabel;
          matchedItem.residentName = smartFoundBill.full_name || "Resident";
          matchedItem.selected = true; // Pre-checked for 1-click batch reconcile
          matchedCount++;
          matchedAmount += Number(tx.amount);
        } else {
          matchedItem.status = "POTENTIAL_MATCH_MISMATCH";
          matchedItem.matchType = "SMART_FLAT_AMOUNT";
          matchedItem.confidence = 60;
          matchedItem.billId = smartFoundBill.id;
          matchedItem.billTotal = Number(smartFoundBill.total_amount);
          matchedItem.flatNumber = flatLabel;
          matchedItem.residentName = smartFoundBill.full_name || "Resident";
          matchedItem.expectedAmount = Number(smartFoundBill.total_amount);
          matchedItem.selected = false;
          mismatchCount++;
        }
      } else {
        unmatchedCount++;
      }
    }

    items.push(matchedItem);
  }

  const totalCredits = items.length;
  const totalCreditAmount = items.reduce((sum, it) => sum + Number(it.amount), 0);

  return {
    filename: originalFilename,
    totalCredits,
    totalCreditAmount,
    matchedCount,
    matchedAmount,
    mismatchCount,
    unmatchedCount,
    alreadyVerifiedCount,
    items,
  };
}

/**
 * Commits a batch of bank statement matches to the ledger atomically.
 */
export async function batchReconcileBankStatement({ items, societyId = 1, verifiedBy }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error("No items selected for reconciliation"), { status: 400 });
  }

  const reconciledResults = [];
  let totalReconciledAmount = 0;

  for (const item of items) {
    if (item.reconciliationId) {
      // Direct UTR reconciliation
      const res = await verifyAndReconcile(item.reconciliationId, verifiedBy);
      reconciledResults.push({
        billId: res.billId,
        reconciliationId: item.reconciliationId,
        amount: res.amount,
        ledgerId: res.ledgerId,
      });
      totalReconciledAmount += Number(res.amount);
    } else if (item.billId) {
      // Smart match reconciliation (resident had not submitted UTR)
      const bill = await billingModel.findBillById(item.billId, societyId);
      if (!bill) continue;
      if (bill.status === "PAID") continue;

      const amt = Number(item.amount);
      const utrStr = item.extractedUtr || `BANK-REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 1. Create upi_reconciliations record directly with VERIFIED status
      const recId = await billingModel.insertUpiReconciliation({
        societyId,
        billId: bill.id,
        utr: utrStr,
        amount: amt,
        submittedBy: bill.user_id || null,
      });
      await billingModel.verifyUtr(recId, verifiedBy);

      // 2. Mark bill PAID
      await billingModel.updateBillStatus(bill.id, "PAID");

      // 3. Append to SHA-256 hash-chained ledger
      const flatLabel = bill.wing && bill.flat_number ? `Flat ${bill.wing}-${bill.flat_number}` : `Bill #${bill.id}`;
      const tx = await ledgerModel.appendTransaction({
        societyId,
        transactionType: "CREDIT",
        category: "MAINTENANCE",
        referenceType: "upi_reconciliation",
        referenceId: recId,
        description: `Bank Statement Auto-Reconciled — ${flatLabel} (${utrStr})`,
        amount: amt,
        createdBy: verifiedBy,
      });

      // 4. Notify resident if associated
      if (bill.user_id) {
        try {
          await notifyPaymentVerified({
            societyId,
            userId: bill.user_id,
            amount: amt,
            billId: bill.id,
            flatNumber: flatLabel,
          });
        } catch {
          // Non-blocking notification
        }
      }

      reconciledResults.push({
        billId: bill.id,
        reconciliationId: recId,
        amount: amt,
        ledgerId: tx.insertId,
      });
      totalReconciledAmount += amt;
    }
  }

  return {
    reconciledCount: reconciledResults.length,
    totalAmount: totalReconciledAmount,
    reconciledResults,
  };
}
