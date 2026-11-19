import pool from "../config/db.js";

export async function getAll(societyId = 1) {
  const [rows] = await pool.execute(
    "SELECT setting_key, setting_value FROM system_settings WHERE society_id = ?",
    [societyId]
  );
  const map = {};
  for (const r of rows) map[r.setting_key] = r.setting_value;
  return map;
}

export async function get(key, societyId = 1) {
  const [rows] = await pool.execute(
    "SELECT setting_value FROM system_settings WHERE society_id = ? AND setting_key = ?",
    [societyId, key]
  );
  return rows[0]?.setting_value ?? null;
}

export async function set(key, value, updatedBy, societyId = 1) {
  await pool.execute(
    `INSERT INTO system_settings (society_id, setting_key, setting_value, updated_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [societyId, key, String(value), updatedBy]
  );
}

export async function bulkSet(entries, updatedBy, societyId = 1) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of Object.entries(entries)) {
      await conn.execute(
        `INSERT INTO system_settings (society_id, setting_key, setting_value, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [societyId, key, String(value), updatedBy]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
