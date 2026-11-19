import crypto from "node:crypto";
import * as upiSessionModel from "../models/upiPaymentSessionModel.js";
import * as billingModel from "../models/billingModel.js";
import * as configModel from "../models/configModel.js";
import * as societyModel from "../models/societyModel.js";
import * as ledgerModel from "../models/ledgerModel.js";
import { notifyPaymentVerified } from "./notificationService.js";
import security from "../config/security.js";

/**
 * Generates an NPCI-compliant UPI Intent URI.
 */
export function generateUpiIntentUri({ vpa, payeeName, amount, referenceId, description }) {
  const cleanVpa = encodeURIComponent(vpa.trim());
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanAmt = Number(amount).toFixed(2);
  const cleanRef = encodeURIComponent(referenceId.trim());
  const cleanNote = encodeURIComponent(description.trim());

  // Standard NPCI spec: pa=VPA, pn=Name, am=Amount, cu=INR, tr=RefId, tn=Note
  return `upi://pay?pa=${cleanVpa}&pn=${cleanName}&am=${cleanAmt}&cu=INR&tr=${cleanRef}&tn=${cleanNote}`;
}

/**
 * Verifies webhook HMAC-SHA256 signature against society/platform secret.
 */
export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!signature || !secret) return true; // Permissive if secret not configured
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(expected.toLowerCase()));
}

/**
 * Initiates a dynamic zero-fee sovereign UPI checkout session for a bill.
 */
export async function createPaymentSession({ billId, societyId = 1, user = null }) {
  const bill = await billingModel.findBillById(billId, societyId);
  if (!bill) {
    throw Object.assign(new Error("Maintenance bill not found"), { status: 404 });
  }

  if (bill.status === "PAID") {
    throw Object.assign(new Error("This bill has already been paid and reconciled"), { status: 409 });
  }

  // Check if an active unexpired session already exists
  const existing = await upiSessionModel.findLatestActiveSession(billId, societyId);
  const vpaVal =
    (await configModel.get("SOCIETY_UPI_VPA", societyId)) ||
    (await configModel.get("UPI_VPA", societyId)) ||
    "9923812557@upi";
  const society = (await societyModel.findById(societyId)) || { name: "Vastu Heights CHS" };

  if (existing) {
    const intentUri = generateUpiIntentUri({
      vpa: existing.vpa,
      payeeName: society.name,
      amount: existing.amount,
      referenceId: existing.reference_id,
      description: `Maint Flat ${bill.wing || ""}-${bill.flat_number || bill.flat_id} Bill #${bill.id}`,
    });

    return {
      referenceId: existing.reference_id,
      amount: Number(existing.amount),
      vpa: existing.vpa,
      payeeName: society.name,
      upiIntentUri: intentUri,
      expiresAt: existing.expires_at,
      bill: {
        id: bill.id,
        flatNumber: `${bill.wing || ""}-${bill.flat_number || bill.flat_id}`,
        billingCycle: bill.billing_cycle,
        totalAmount: Number(bill.total_amount),
      },
    };
  }

  // Generate deterministic reference: VL-S<socId>-B<billId>-<timestampHex><randomHex>
  const tsHex = Date.now().toString(36).toUpperCase();
  const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  const referenceId = `VL-S${societyId}-B${billId}-${tsHex}${randHex}`;

  const amount = Number(bill.total_amount);

  await upiSessionModel.createSession({
    societyId,
    billId,
    referenceId,
    amount,
    vpa: vpaVal,
    gatewayProvider: "SOVEREIGN_UPI",
    expiresInMinutes: 30,
  });

  const intentUri = generateUpiIntentUri({
    vpa: vpaVal,
    payeeName: society.name,
    amount,
    referenceId,
    description: `Maint Flat ${bill.wing || ""}-${bill.flat_number || bill.flat_id} Bill #${bill.id}`,
  });

  const session = await upiSessionModel.findSessionByRef(referenceId, societyId);

  return {
    referenceId,
    amount,
    vpa: vpaVal,
    payeeName: society.name,
    upiIntentUri: intentUri,
    expiresAt: session?.expires_at,
    bill: {
      id: bill.id,
      flatNumber: `${bill.wing || ""}-${bill.flat_number || bill.flat_id}`,
      billingCycle: bill.billing_cycle,
      totalAmount: amount,
    },
  };
}

/**
 * Checks session payment status (polled by frontend while QR is open).
 */
export async function getSessionStatus(referenceId, societyId = null) {
  const session = await upiSessionModel.findSessionByRef(referenceId, societyId);
  if (!session) {
    throw Object.assign(new Error("Payment session not found"), { status: 404 });
  }

  // Auto-expire if time has passed
  if (session.status === "PENDING" && new Date(session.expires_at) < new Date()) {
    await upiSessionModel.updateSessionStatus(referenceId, "EXPIRED");
    session.status = "EXPIRED";
  }

  return {
    referenceId: session.reference_id,
    billId: session.bill_id,
    amount: Number(session.amount),
    status: session.status,
    utr: session.utr,
    paidAt: session.paid_at,
  };
}

/**
 * Ingestion webhook: processes incoming gateway payment callbacks (PhonePe, Paytm, UPILerify, or Bank Webhooks)
 * Automatically verifies payment and executes atomic SHA-256 ledger chaining without human intervention.
 */
export async function processGatewayWebhook({ payload, signature = null, rawBody = null }) {
  const secret = process.env.GATEWAY_WEBHOOK_SECRET || security.jwt.accessSecret;

  if (signature && rawBody) {
    const isValid = verifyWebhookSignature({ rawBody, signature, secret });
    if (!isValid) {
      throw Object.assign(new Error("Unauthorized: Invalid webhook HMAC signature"), { status: 401 });
    }
  }

  // Normalize incoming fields
  const referenceId = payload.referenceId || payload.tr || payload.transactionRef || payload.orderId;
  const utr = payload.utr || payload.rrn || payload.bankRefNo;
  const amount = Number(payload.amount);
  const statusStr = String(payload.status || "SUCCESS").toUpperCase();
  const payerVpa = payload.payerVpa || payload.senderVpa || null;

  if (!referenceId) {
    throw Object.assign(new Error("Missing transaction reference ID in webhook payload"), { status: 400 });
  }

  const isSuccess = ["SUCCESS", "COMPLETED", "TXN_SUCCESS", "PAID"].includes(statusStr);
  if (!isSuccess) {
    await upiSessionModel.updateSessionStatus(referenceId, "FAILED");
    return { success: true, processed: false, reason: "Payment status is not successful" };
  }

  const session = await upiSessionModel.findSessionByRef(referenceId);
  if (!session) {
    throw Object.assign(new Error(`Payment session '${referenceId}' not found`), { status: 404 });
  }

  // Idempotent: if already processed, return success immediately
  if (session.status === "SUCCESS") {
    return { success: true, alreadyProcessed: true, billId: session.bill_id, utr: session.utr };
  }

  const societyId = session.society_id;
  const billId = session.bill_id;

  const bill = await billingModel.findBillById(billId, societyId);
  if (!bill) {
    throw Object.assign(new Error("Bill associated with session not found"), { status: 404 });
  }

  const finalUtr = utr || `GW-AUTOREC-${Date.now()}`;

  // 1. Mark session SUCCESS
  await upiSessionModel.markSessionSuccess(referenceId, {
    utr: finalUtr,
    payerVpa,
  });

  // 2. Insert verified UPI reconciliation record
  const recId = await billingModel.insertUpiReconciliation({
    societyId,
    billId: bill.id,
    utr: finalUtr,
    amount: amount || Number(session.amount),
    submittedBy: bill.user_id || null,
  });
  await billingModel.verifyUtr(recId, 1); // 1 = System / Automated Gateway

  // 3. Mark bill PAID
  await billingModel.updateBillStatus(bill.id, "PAID");

  // 4. Append to tamper-evident SHA-256 hash-chained ledger
  const flatLabel = bill.wing && bill.flat_number ? `Flat ${bill.wing}-${bill.flat_number}` : `Bill #${bill.id}`;
  const tx = await ledgerModel.appendTransaction({
    societyId,
    transactionType: "CREDIT",
    category: "MAINTENANCE",
    referenceType: "upi_reconciliation",
    referenceId: recId,
    description: `Zero-Fee Sovereign UPI Gateway — ${flatLabel} (UTR: ${finalUtr})`,
    amount: amount || Number(session.amount),
    createdBy: 1, // System Automated
  });

  // 5. Notify resident directly
  try {
    const { sendReceiptNotification } = await import("./whatsappService.js");
    await sendReceiptNotification({
      billId: bill.id,
      societyId,
      utr: finalUtr,
      amount: amount || Number(session.amount),
      ledgerRef: tx.currentHash || String(tx.insertId),
    });
  } catch {
    // Non-blocking WhatsApp dispatch
  }

  if (bill.user_id) {
    try {
      await notifyPaymentVerified({
        societyId,
        userId: bill.user_id,
        amount: amount || Number(session.amount),
        billId: bill.id,
        flatNumber: flatLabel,
      });
    } catch {
      // Non-blocking notification
    }
  }

  return {
    success: true,
    processed: true,
    billId: bill.id,
    referenceId,
    utr: finalUtr,
    amount: amount || Number(session.amount),
    ledgerId: tx.insertId,
  };
}
