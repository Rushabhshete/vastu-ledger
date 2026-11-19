import pool from "../config/db.js";
import * as configModel from "../models/configModel.js";
import * as whatsappLogModel from "../models/whatsappLogModel.js";
import * as billingModel from "../models/billingModel.js";
import * as cryptoVault from "../utils/cryptoVault.js";
import { generateUpiIntentUri } from "./upiGatewayService.js";

function formatINR(val) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

const DEFAULT_VERIFY_TOKEN = "vastu_ledger_whatsapp_verify_secret_2026";

/**
 * Retrieves society WhatsApp configuration with env fallback.
 */
export async function getWhatsAppConfig(societyId = 1) {
  const settings = await configModel.getAll(societyId);

  const phoneNumberId = settings["WHATSAPP_PHONE_NUMBER_ID"] || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const accessToken = settings["WHATSAPP_ACCESS_TOKEN"] || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const businessAccountId = settings["WHATSAPP_BUSINESS_ACCOUNT_ID"] || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  const verifyToken = settings["WHATSAPP_VERIFY_TOKEN"] || process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;
  const autoDispatchBills = settings["WHATSAPP_AUTO_DISPATCH_BILLS"] === "true";
  const autoDueReminders = settings["WHATSAPP_AUTO_DUE_REMINDERS"] === "true";

  const isConfigured = Boolean(phoneNumberId && accessToken);

  return {
    isConfigured,
    mode: isConfigured ? "LIVE_CLOUD_API" : "SIMULATED_SOVEREIGN",
    phoneNumberId,
    businessAccountId,
    verifyToken,
    autoDispatchBills,
    autoDueReminders,
  };
}

/**
 * Updates WhatsApp credentials and automated triggers for a society.
 */
export async function updateWhatsAppConfig(societyId, config, userId) {
  const entries = {};
  if (config.phoneNumberId !== undefined) entries["WHATSAPP_PHONE_NUMBER_ID"] = config.phoneNumberId.trim();
  if (config.accessToken !== undefined) entries["WHATSAPP_ACCESS_TOKEN"] = config.accessToken.trim();
  if (config.businessAccountId !== undefined) entries["WHATSAPP_BUSINESS_ACCOUNT_ID"] = config.businessAccountId.trim();
  if (config.verifyToken !== undefined) entries["WHATSAPP_VERIFY_TOKEN"] = config.verifyToken.trim();
  if (config.autoDispatchBills !== undefined) entries["WHATSAPP_AUTO_DISPATCH_BILLS"] = String(Boolean(config.autoDispatchBills));
  if (config.autoDueReminders !== undefined) entries["WHATSAPP_AUTO_DUE_REMINDERS"] = String(Boolean(config.autoDueReminders));

  await configModel.bulkSet(entries, userId, societyId);
  return getWhatsAppConfig(societyId);
}

/**
 * Low-level message dispatcher (dispatches to Meta Cloud API or Sovereign Simulator).
 */
export async function sendWhatsAppMessage({
  societyId,
  recipientPhone,
  recipientName = null,
  userId = null,
  flatId = null,
  billId = null,
  templateName,
  messageType = "GENERAL",
  messageBody,
  metadata = null,
}) {
  const cleanPhone = recipientPhone.replace(/[^0-9+]/g, "");
  const config = await getWhatsAppConfig(societyId);

  let status = "SENT";
  let externalMessageId = null;
  let errorMessage = null;

  if (config.isConfigured) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone.replace("+", ""),
            type: "text",
            text: { preview_url: true, body: messageBody },
          }),
        }
      );

      const resData = await response.json();
      if (!response.ok) {
        status = "FAILED";
        errorMessage = resData.error?.message || "Meta API error";
      } else {
        externalMessageId = resData.messages?.[0]?.id || `wamid.${Date.now()}`;
        status = "DELIVERED";
      }
    } catch (err) {
      status = "FAILED";
      errorMessage = err.message;
    }
  } else {
    // Sovereign Simulation Mode: Instant simulated dispatch
    externalMessageId = `wamid.SIM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    status = "DELIVERED";
  }

  const logId = await whatsappLogModel.createLog({
    societyId,
    recipientPhone: cleanPhone,
    recipientName,
    userId,
    flatId,
    billId,
    templateName,
    messageType,
    messageBody,
    status,
    externalMessageId,
    errorMessage,
    metadata,
  });

  return {
    logId,
    status,
    externalMessageId,
    recipientPhone: cleanPhone,
    mode: config.mode,
  };
}

/**
 * Finds the primary resident associated with a flat.
 */
async function getResidentForFlat(flatId, societyId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.full_name, u.email, u.phone_encrypted, f.wing, f.number AS flat_number
     FROM flats f
     LEFT JOIN users u ON u.flat_id = f.id AND u.is_active = TRUE
     WHERE f.id = ? AND f.society_id = ?
     LIMIT 1`,
    [flatId, societyId]
  );

  if (!rows.length) return null;
  const row = rows[0];

  let phone = null;
  if (row.phone_encrypted) {
    try {
      phone = cryptoVault.decrypt(row.phone_encrypted);
    } catch (e) {
      console.warn("Could not decrypt phone for user", row.id);
    }
  }

  // If no phone found, provide default formatted test phone
  if (!phone) {
    phone = `+91 98201 ${String(row.id || 100).padStart(5, "0")}`;
  }

  return {
    userId: row.id || null,
    name: row.full_name || `Resident Flat ${row.wing}-${row.flat_number}`,
    phone,
    flatNumber: `${row.wing}-${row.flat_number}`,
  };
}

/**
 * Dispatches monthly maintenance bill alert to resident WhatsApp with 1-click UPI URI.
 */
export async function sendBillNotification(billId, societyId = 1) {
  const bill = await billingModel.findBillById(billId, societyId);
  if (!bill) {
    throw Object.assign(new Error("Maintenance bill not found"), { status: 404 });
  }

  const resident = await getResidentForFlat(bill.flat_id, societyId);
  if (!resident) {
    throw Object.assign(new Error("No resident contact associated with this flat"), { status: 400 });
  }

  const [socRows] = await pool.execute("SELECT name FROM societies WHERE id = ?", [societyId]);
  const societyName = socRows[0]?.name || "VastuLedger Society";

  const totalAmount = Number(bill.total_amount);
  const upiUri = generateUpiIntentUri({
    vpa: "vastu.ledger@upi",
    payeeName: societyName,
    amount: totalAmount,
    referenceId: `VL-BILL-${bill.id}`,
    description: `Maint Flat ${resident.flatNumber} ${bill.billing_cycle}`,
  });

  const dueDateFormatted = new Date(bill.due_date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const messageBody = [
    `🏛️ *${societyName}* - Official Maintenance Bill`,
    ``,
    `Dear *${resident.name}*,`,
    `Your maintenance bill for *Flat ${resident.flatNumber}* (${bill.billing_cycle}) has been generated.`,
    ``,
    `💰 *Total Amount Due:* ${formatINR(totalAmount)}`,
    `📅 *Due Date:* ${dueDateFormatted}`,
    ``,
    `⚡ *Instant 0% Fee UPI Payment:*`,
    `Tap below to open PhonePe / GPay / BHIM:`,
    `${upiUri}`,
    ``,
    `_Receipt and audit ledger hash will be instantly recorded upon bank settlement._`,
  ].join("\n");

  const dispatchResult = await sendWhatsAppMessage({
    societyId,
    recipientPhone: resident.phone,
    recipientName: resident.name,
    userId: resident.userId,
    flatId: bill.flat_id,
    billId: bill.id,
    templateName: "bill_dispatch_v1",
    messageType: "BILL_DISPATCH",
    messageBody,
    metadata: {
      billId: bill.id,
      amount: totalAmount,
      cycle: bill.billing_cycle,
    },
  });

  return {
    ...dispatchResult,
    residentName: resident.name,
    flatNumber: resident.flatNumber,
    billAmount: totalAmount,
  };
}

/**
 * Batch dispatches due date reminders to all residents with unpaid/pending bills.
 */
export async function sendBatchDueReminders(societyId = 1) {
  const pendingBills = await billingModel.listBills({
    societyId,
    status: "PENDING",
  });

  const [socRows] = await pool.execute("SELECT name FROM societies WHERE id = ?", [societyId]);
  const societyName = socRows[0]?.name || "VastuLedger Society";

  let sentCount = 0;
  let failedCount = 0;
  const dispatchedLogs = [];

  for (const bill of pendingBills) {
    try {
      const resident = await getResidentForFlat(bill.flat_id, societyId);
      if (!resident || !resident.phone) continue;

      const totalAmount = Number(bill.total_amount);
      const upiUri = generateUpiIntentUri({
        vpa: "vastu.ledger@upi",
        payeeName: societyName,
        amount: totalAmount,
        referenceId: `VL-REM-${bill.id}`,
        description: `Reminder Maint Flat ${resident.flatNumber}`,
      });

      const dueDateFormatted = new Date(bill.due_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const messageBody = [
        `⚠️ *Payment Reminder - ${societyName}*`,
        ``,
        `Dear *${resident.name}*,`,
        `This is a gentle reminder that maintenance dues of *${formatINR(totalAmount)}* for *Flat ${resident.flatNumber}* remain pending.`,
        ``,
        `📅 *Due Date:* ${dueDateFormatted}`,
        ``,
        `Please settle before the due date to avoid the 18% p.a. statutory late-fee interest.`,
        ``,
        `⚡ *Instant UPI Payment Link:*`,
        `${upiUri}`,
      ].join("\n");

      const result = await sendWhatsAppMessage({
        societyId,
        recipientPhone: resident.phone,
        recipientName: resident.name,
        userId: resident.userId,
        flatId: bill.flat_id,
        billId: bill.id,
        templateName: "payment_reminder_v1",
        messageType: "PAYMENT_REMINDER",
        messageBody,
        metadata: { billId: bill.id, amount: totalAmount },
      });

      if (result.status !== "FAILED") sentCount++;
      else failedCount++;

      dispatchedLogs.push({
        billId: bill.id,
        flatNumber: resident.flatNumber,
        recipient: resident.name,
        phone: resident.phone,
        status: result.status,
      });
    } catch (err) {
      failedCount++;
    }
  }

  return {
    totalPendingBills: pendingBills.length,
    sentCount,
    failedCount,
    dispatchedLogs,
  };
}

/**
 * Dispatches verified payment confirmation receipt upon bank webhook settlement.
 */
export async function sendReceiptNotification({
  billId,
  societyId = 1,
  utr,
  amount,
  ledgerRef = null,
}) {
  const bill = await billingModel.findBillById(billId, societyId);
  if (!bill) return;

  const resident = await getResidentForFlat(bill.flat_id, societyId);
  if (!resident || !resident.phone) return;

  const [socRows] = await pool.execute("SELECT name FROM societies WHERE id = ?", [societyId]);
  const societyName = socRows[0]?.name || "VastuLedger Society";

  const messageBody = [
    `✅ *Payment Received & Verified - ${societyName}*`,
    ``,
    `Dear *${resident.name}*,`,
    `We have confirmed receipt of *${formatINR(amount)}* for *Flat ${resident.flatNumber}* (${bill.billing_cycle}).`,
    ``,
    `🏦 *Bank Reference / UTR:* ${utr}`,
    ledgerRef ? `🔒 *Ledger Crypt-Hash:* ${ledgerRef.substring(0, 16)}...` : ``,
    ``,
    `Your official society maintenance receipt has been marked PAID and permanently chained in the society audit ledger.`,
  ].filter(Boolean).join("\n");

  return sendWhatsAppMessage({
    societyId,
    recipientPhone: resident.phone,
    recipientName: resident.name,
    userId: resident.userId,
    flatId: bill.flat_id,
    billId: bill.id,
    templateName: "payment_receipt_v1",
    messageType: "RECEIPT_CONFIRMATION",
    messageBody,
    metadata: { billId: bill.id, utr, amount },
  });
}

/**
 * Dispatches emergency announcement or general broadcast to all society members.
 */
export async function sendBroadcast(societyId = 1, { title, message, urgency = "HIGH" }) {
  const [residents] = await pool.execute(
    `SELECT DISTINCT u.id, u.full_name, u.phone_encrypted, f.wing, f.number AS flat_number
     FROM flats f
     JOIN users u ON u.flat_id = f.id AND u.is_active = TRUE
     WHERE f.society_id = ?`,
    [societyId]
  );

  const [socRows] = await pool.execute("SELECT name FROM societies WHERE id = ?", [societyId]);
  const societyName = socRows[0]?.name || "VastuLedger Society";

  let sentCount = 0;
  let failedCount = 0;

  for (const r of residents) {
    let phone = null;
    if (r.phone_encrypted) {
      try { phone = cryptoVault.decrypt(r.phone_encrypted); } catch {}
    }
    if (!phone) phone = `+91 98201 ${String(r.id || 100).padStart(5, "0")}`;

    const messageBody = [
      `🚨 *URGENT NOTICE: ${societyName}*`,
      `*${title.toUpperCase()}*`,
      ``,
      `${message}`,
      ``,
      `Priority: *${urgency}*`,
      `Issued By: *Managing Committee*`,
    ].join("\n");

    try {
      const res = await sendWhatsAppMessage({
        societyId,
        recipientPhone: phone,
        recipientName: r.full_name,
        userId: r.id,
        templateName: "emergency_broadcast_v1",
        messageType: "EMERGENCY_BROADCAST",
        messageBody,
        metadata: { title, urgency },
      });
      if (res.status !== "FAILED") sentCount++;
      else failedCount++;
    } catch {
      failedCount++;
    }
  }

  return {
    totalResidents: residents.length,
    sentCount,
    failedCount,
  };
}

/**
 * Webhook handshake verification for Meta Graph API.
 */
export async function verifyWebhook(mode, token, challenge, societyId = 1) {
  const config = await getWhatsAppConfig(societyId);
  if (mode === "subscribe" && token === config.verifyToken) {
    return challenge;
  }
  throw Object.assign(new Error("Forbidden — invalid WhatsApp webhook token"), { status: 403 });
}

/**
 * Processes incoming status updates or resident replies from Meta Cloud API.
 */
export async function processWebhookEvent(payload) {
  if (payload.object !== "whatsapp_business_account") {
    return { received: true, ignored: true };
  }

  const entries = payload.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const val = change.value || {};

      // 1. Delivery & Read Status Updates
      if (val.statuses && Array.isArray(val.statuses)) {
        for (const st of val.statuses) {
          const messageId = st.id;
          const statusRaw = st.status?.toUpperCase(); // "SENT", "DELIVERED", "READ", "FAILED"
          const errReason = st.errors?.[0]?.message || null;
          if (messageId && statusRaw) {
            await whatsappLogModel.updateStatusByExternalId(messageId, statusRaw, errReason);
          }
        }
      }

      // 2. Incoming messages (interactive bot answers e.g. "BALANCE")
      if (val.messages && Array.isArray(val.messages)) {
        for (const msg of val.messages) {
          const from = msg.from;
          const text = msg.text?.body?.trim().toUpperCase();
          if (text === "BALANCE" || text === "DUES") {
            // Future extension: Auto-reply with pending dues statement
            console.log(`[WhatsApp Bot] Inbound query "${text}" received from ${from}`);
          }
        }
      }
    }
  }

  return { received: true };
}
