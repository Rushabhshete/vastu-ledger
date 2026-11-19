import * as whatsappService from "../services/whatsappService.js";
import * as whatsappLogModel from "../models/whatsappLogModel.js";
import { recordAuditEvent } from "../services/auditService.js";

/**
 * GET /api/whatsapp/stats
 */
export async function getStats(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const stats = await whatsappLogModel.getDeliveryStats(societyId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/whatsapp/logs
 */
export async function listLogs(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const { limit, offset, messageType, status, billId } = req.query;

    const logs = await whatsappLogModel.listLogs(societyId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      messageType: messageType || null,
      status: status || null,
      billId: billId ? Number(billId) : null,
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/whatsapp/config
 */
export async function getConfig(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const config = await whatsappService.getWhatsAppConfig(societyId);
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/whatsapp/config
 */
export async function updateConfig(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const userId = req.user.id;
    const updated = await whatsappService.updateWhatsAppConfig(societyId, req.body, userId);

    await recordAuditEvent({
      societyId,
      userId,
      action: "WHATSAPP_CONFIG_UPDATED",
      entityType: "system_settings",
      entityId: societyId,
      details: { mode: updated.mode, phoneNumberId: updated.phoneNumberId },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/whatsapp/send-bill/:billId
 */
export async function sendBillNotification(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const billId = Number(req.params.billId);

    const result = await whatsappService.sendBillNotification(billId, societyId);

    await recordAuditEvent({
      societyId,
      userId: req.user.id,
      action: "WHATSAPP_BILL_DISPATCHED",
      entityType: "maintenance_bills",
      entityId: billId,
      details: { recipientPhone: result.recipientPhone, status: result.status },
    });

    res.json({
      success: true,
      message: `WhatsApp bill alert successfully dispatched to ${result.residentName} (${result.recipientPhone})`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/whatsapp/batch-reminders
 */
export async function sendBatchDueReminders(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const result = await whatsappService.sendBatchDueReminders(societyId);

    await recordAuditEvent({
      societyId,
      userId: req.user.id,
      action: "WHATSAPP_BATCH_REMINDERS_SENT",
      entityType: "whatsapp_logs",
      entityId: societyId,
      details: { sentCount: result.sentCount, failedCount: result.failedCount },
    });

    res.json({
      success: true,
      message: `Dispatched payment reminders to ${result.sentCount} flats via WhatsApp`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/whatsapp/broadcast
 */
export async function sendBroadcast(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const { title, message, urgency } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: "Title and message are required" });
    }

    const result = await whatsappService.sendBroadcast(societyId, {
      title,
      message,
      urgency: urgency || "HIGH",
    });

    await recordAuditEvent({
      societyId,
      userId: req.user.id,
      action: "WHATSAPP_EMERGENCY_BROADCAST",
      entityType: "whatsapp_logs",
      entityId: societyId,
      details: { title, sentCount: result.sentCount },
    });

    res.json({
      success: true,
      message: `Broadcast message sent to ${result.sentCount} registered residents`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/whatsapp/webhook (Meta Verify Challenge)
 */
export async function verifyWebhook(req, res, next) {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const responseChallenge = await whatsappService.verifyWebhook(mode, token, challenge);
    res.status(200).send(responseChallenge);
  } catch (err) {
    res.status(403).send("Verification failed");
  }
}

/**
 * POST /api/whatsapp/webhook (Meta Status & Inbound Messages)
 */
export async function handleWebhook(req, res, next) {
  try {
    await whatsappService.processWebhookEvent(req.body);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[WhatsApp Webhook Error]", err);
    res.status(200).json({ success: false, error: err.message });
  }
}
