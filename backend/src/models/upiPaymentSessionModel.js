import pool from "../config/db.js";

/**
 * Creates a new dynamic UPI payment session.
 */
export async function createSession({
  societyId,
  billId,
  referenceId,
  amount,
  vpa,
  gatewayProvider = "SOVEREIGN_UPI",
  expiresInMinutes = 30,
}) {
  const [result] = await pool.execute(
    `INSERT INTO upi_payment_sessions
       (society_id, bill_id, reference_id, amount, vpa, gateway_provider, status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [societyId, billId, referenceId, amount, vpa, gatewayProvider, expiresInMinutes]
  );
  return result.insertId;
}

/**
 * Finds a session by its unique transaction reference ID.
 */
export async function findSessionByRef(referenceId, societyId = null) {
  let sql = "SELECT * FROM upi_payment_sessions WHERE reference_id = ?";
  const params = [referenceId];
  if (societyId) {
    sql += " AND society_id = ?";
    params.push(societyId);
  }
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

/**
 * Finds the latest active session for a bill.
 */
export async function findLatestActiveSession(billId, societyId = null) {
  let sql = `
    SELECT * FROM upi_payment_sessions
    WHERE bill_id = ? AND status = 'PENDING' AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `;
  const params = [billId];
  if (societyId) {
    sql = `
      SELECT * FROM upi_payment_sessions
      WHERE bill_id = ? AND society_id = ? AND status = 'PENDING' AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `;
    params.push(societyId);
  }
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

/**
 * Marks session as successfully paid.
 */
export async function markSessionSuccess(referenceId, { utr = null, payerVpa = null }) {
  await pool.execute(
    `UPDATE upi_payment_sessions
     SET status = 'SUCCESS', utr = ?, payer_vpa = ?, paid_at = NOW()
     WHERE reference_id = ?`,
    [utr, payerVpa, referenceId]
  );
}

/**
 * Marks session as expired or failed.
 */
export async function updateSessionStatus(referenceId, status) {
  await pool.execute(
    "UPDATE upi_payment_sessions SET status = ? WHERE reference_id = ?",
    [status, referenceId]
  );
}
