import pool from "../config/db.js";

/**
 * Query audit logs with multi-tenant scoping, action/date filters, text search, and pagination.
 */
export async function getAuditLogs({
  limit = 50,
  offset = 0,
  societyId = null,
  action = null,
  userId = null,
  startDate = null,
  endDate = null,
  search = null,
} = {}) {
  let whereClauses = ["1=1"];
  const params = [];

  if (societyId) {
    whereClauses.push("(al.society_id = ? OR al.society_id IS NULL)");
    params.push(societyId);
  }

  if (action && action !== "ALL") {
    whereClauses.push("al.action = ?");
    params.push(action);
  }

  if (userId) {
    whereClauses.push("al.user_id = ?");
    params.push(userId);
  }

  if (startDate) {
    whereClauses.push("al.occurred_at >= ?");
    params.push(`${startDate} 00:00:00`);
  }

  if (endDate) {
    whereClauses.push("al.occurred_at <= ?");
    params.push(`${endDate} 23:59:59`);
  }

  if (search) {
    whereClauses.push("(al.action LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR al.entity_type LIKE ?)");
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.join(" AND ");

  // Count total matching
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM audit_logs al JOIN users u ON al.user_id = u.id WHERE ${whereSql}`,
    params
  );
  const total = countRows[0]?.total || 0;

  // Fetch distinct actions for filter dropdown
  const [actionRows] = await pool.execute(
    `SELECT DISTINCT action FROM audit_logs WHERE society_id = ? OR society_id IS NULL ORDER BY action ASC`,
    societyId ? [societyId] : [1]
  );
  const availableActions = actionRows.map((r) => r.action);

  // Query logs with pagination
  const numLimit = Math.max(1, Math.min(Number(limit) || 50, 500));
  const numOffset = Math.max(0, Number(offset) || 0);

  const [rows] = await pool.execute(
    `SELECT al.*, u.full_name, u.email, u.role as user_role
     FROM audit_logs al
     JOIN users u ON al.user_id = u.id
     WHERE ${whereSql}
     ORDER BY al.occurred_at DESC
     LIMIT ? OFFSET ?`,
    [...params, numLimit, numOffset]
  );

  return {
    logs: rows,
    total,
    limit: numLimit,
    offset: numOffset,
    availableActions,
  };
}

export async function getAuditLogsByUser(userId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.execute(
    `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY occurred_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows;
}

export async function recordAuditEvent({
  societyId = null,
  userId,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = null,
}) {
  const [res] = await pool.execute(
    `INSERT INTO audit_logs (society_id, user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      userId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      ipAddress,
    ]
  );
  return res.insertId;
}
