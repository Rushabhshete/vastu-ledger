import pool from "../config/db.js";

/**
 * Ensures the whatsapp_logs table exists in MySQL.
 */
export async function ensureTable() {
  const ddl = `
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
      society_id          BIGINT NOT NULL,
      recipient_phone     VARCHAR(20) NOT NULL,
      recipient_name      VARCHAR(255) NULL,
      user_id             BIGINT NULL,
      flat_id             BIGINT NULL,
      bill_id             BIGINT NULL,
      template_name       VARCHAR(100) NOT NULL,
      message_type        ENUM('BILL_DISPATCH', 'PAYMENT_REMINDER', 'RECEIPT_CONFIRMATION', 'HELPDESK_UPDATE', 'EMERGENCY_BROADCAST', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
      message_body        TEXT NOT NULL,
      status              ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED') DEFAULT 'SENT',
      external_message_id VARCHAR(255) NULL,
      error_message       TEXT NULL,
      metadata            JSON NULL,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wa_soc_type (society_id, message_type),
      INDEX idx_wa_status (status),
      INDEX idx_wa_ext_id (external_message_id),
      INDEX idx_wa_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.execute(ddl);
}

/**
 * Records an outbound or simulated WhatsApp notification dispatch.
 */
export async function createLog({
  societyId,
  recipientPhone,
  recipientName = null,
  userId = null,
  flatId = null,
  billId = null,
  templateName,
  messageType = "GENERAL",
  messageBody,
  status = "SENT",
  externalMessageId = null,
  errorMessage = null,
  metadata = null,
}) {
  await ensureTable();

  const [result] = await pool.execute(
    `INSERT INTO whatsapp_logs 
     (society_id, recipient_phone, recipient_name, user_id, flat_id, bill_id, template_name, message_type, message_body, status, external_message_id, error_message, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      recipientPhone,
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
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  return result.insertId;
}

/**
 * Updates status from Meta Webhook events (e.g. delivered, read, failed).
 */
export async function updateStatusByExternalId(externalMessageId, status, errorMessage = null) {
  await ensureTable();
  const [result] = await pool.execute(
    `UPDATE whatsapp_logs 
     SET status = ?, error_message = COALESCE(?, error_message), updated_at = CURRENT_TIMESTAMP
     WHERE external_message_id = ?`,
    [status, errorMessage, externalMessageId]
  );
  return result.affectedRows > 0;
}

/**
 * Lists WhatsApp logs with filtering.
 */
export async function listLogs(societyId, { limit = 50, offset = 0, messageType = null, status = null, billId = null } = {}) {
  await ensureTable();

  let query = `
    SELECT 
      w.*,
      f.wing,
      f.number AS flat_number,
      u.full_name AS user_full_name,
      u.email AS user_email
    FROM whatsapp_logs w
    LEFT JOIN flats f ON w.flat_id = f.id
    LEFT JOIN users u ON w.user_id = u.id
    WHERE w.society_id = ?
  `;
  const params = [societyId];

  if (messageType) {
    query += ` AND w.message_type = ?`;
    params.push(messageType);
  }

  if (status) {
    query += ` AND w.status = ?`;
    params.push(status);
  }

  if (billId) {
    query += ` AND w.bill_id = ?`;
    params.push(billId);
  }

  query += ` ORDER BY w.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.execute(query, params);
  return rows;
}

/**
 * Aggregates delivery telemetry stats for the society WhatsApp dashboard.
 */
export async function getDeliveryStats(societyId) {
  await ensureTable();

  const [counts] = await pool.execute(
    `SELECT 
       COUNT(*) AS total,
       SUM(CASE WHEN status IN ('SENT', 'DELIVERED', 'READ') THEN 1 ELSE 0 END) AS successful,
       SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN status = 'READ' THEN 1 ELSE 0 END) AS read_count,
       SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN message_type = 'BILL_DISPATCH' THEN 1 ELSE 0 END) AS bill_dispatches,
       SUM(CASE WHEN message_type = 'PAYMENT_REMINDER' THEN 1 ELSE 0 END) AS reminders,
       SUM(CASE WHEN message_type = 'RECEIPT_CONFIRMATION' THEN 1 ELSE 0 END) AS receipts,
       SUM(CASE WHEN message_type = 'EMERGENCY_BROADCAST' THEN 1 ELSE 0 END) AS broadcasts
     FROM whatsapp_logs
     WHERE society_id = ?`,
    [societyId]
  );

  const stats = counts[0] || {};
  const total = Number(stats.total || 0);
  const delivered = Number(stats.delivered || 0) + Number(stats.read_count || 0);
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100;
  const readRate = total > 0 ? Math.round((Number(stats.read_count || 0) / total) * 100) : 0;

  return {
    total,
    successful: Number(stats.successful || 0),
    delivered: Number(stats.delivered || 0),
    read: Number(stats.read_count || 0),
    failed: Number(stats.failed || 0),
    deliveryRate,
    readRate,
    byType: {
      billDispatches: Number(stats.bill_dispatches || 0),
      reminders: Number(stats.reminders || 0),
      receipts: Number(stats.receipts || 0),
      broadcasts: Number(stats.broadcasts || 0),
    },
  };
}
