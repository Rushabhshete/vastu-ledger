import pool from "../config/db.js";

export async function listBySociety(societyId) {
  const [rows] = await pool.query(
    `SELECT w.*,
      (SELECT COUNT(*) FROM flats f WHERE f.wing_id = w.id) as flat_count
     FROM wings w
     WHERE w.society_id = ?
     ORDER BY w.code ASC, w.name ASC`,
    [societyId]
  );
  return rows;
}

export async function findById(id, societyId) {
  const [rows] = await pool.query(
    "SELECT * FROM wings WHERE id = ? AND society_id = ?",
    [id, societyId]
  );
  return rows[0] || null;
}

export async function create({ societyId, name, code, totalFloors = 1, hasElevator = true }) {
  const [res] = await pool.execute(
    `INSERT INTO wings (society_id, name, code, total_floors, has_elevator)
     VALUES (?, ?, ?, ?, ?)`,
    [societyId, name, code.toUpperCase(), totalFloors, hasElevator ? 1 : 0]
  );
  return res.insertId;
}

export async function update(id, societyId, fields) {
  const allowed = ["name", "code", "total_floors", "has_elevator"];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return;

  const sets = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  await pool.execute(
    `UPDATE wings SET ${sets} WHERE id = ? AND society_id = ?`,
    [...vals, id, societyId]
  );
}

export async function deleteWing(id, societyId) {
  await pool.execute("DELETE FROM wings WHERE id = ? AND society_id = ?", [id, societyId]);
}
