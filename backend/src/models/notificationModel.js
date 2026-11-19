import pool from "../config/db.js";

export async function createNotification({
  societyId,
  userId = null,
  role = null,
  title,
  detail,
  type = "SYSTEM",
  link = null,
}) {
  const [result] = await pool.execute(
    `INSERT INTO notifications (society_id, user_id, role, title, detail, type, link, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
    [societyId, userId, role, title, detail, type, link]
  );
  return result.insertId;
}

export async function listNotifications({ societyId, userId, role, limit = 20 }) {
  let sql = `
    SELECT * FROM notifications
    WHERE society_id = ?
      AND (user_id = ? OR user_id IS NULL)
      AND (role = ? OR role IS NULL OR ? = 'ADMIN' OR ? = 'SUPERADMIN')
    ORDER BY created_at DESC
    LIMIT ?
  `;
  const params = [
    societyId,
    userId || null,
    role || null,
    role || "",
    role || "",
    Number(limit) || 20,
  ];

  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function markAsRead(id, userId = null) {
  let sql = "UPDATE notifications SET is_read = TRUE WHERE id = ?";
  const params = [id];
  if (userId) {
    sql += " AND (user_id = ? OR user_id IS NULL)";
    params.push(userId);
  }
  await pool.execute(sql, params);
}

export async function markAllAsRead(societyId, userId = null, role = null) {
  let sql = "UPDATE notifications SET is_read = TRUE WHERE society_id = ?";
  const params = [societyId];
  if (userId) {
    sql += " AND (user_id = ? OR user_id IS NULL)";
    params.push(userId);
  }
  if (role && role !== "ADMIN") {
    sql += " AND (role = ? OR role IS NULL)";
    params.push(role);
  }
  await pool.execute(sql, params);
}
