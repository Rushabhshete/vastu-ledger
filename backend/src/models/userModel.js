import pool from "../config/db.js";

export async function findByEmail(email) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0] || null;
  // If is_active column exists and user is marked inactive (0/false), reject
  if (user && user.is_active !== undefined && (user.is_active === 0 || user.is_active === false)) {
    return null;
  }
  return user;
}

export async function findById(id) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
  const user = rows[0] || null;
  if (user && user.is_active !== undefined && (user.is_active === 0 || user.is_active === false)) {
    return null;
  }
  return user;
}

export async function createUser({ email, passwordHash, fullName, role, flatId }) {
  const [result] = await pool.execute(
    "INSERT INTO users (email, password_hash, full_name, role, flat_id) VALUES (?, ?, ?, ?, ?)",
    [email, passwordHash, fullName, role, flatId || null]
  );
  return result.insertId;
}

export async function updateUser(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const sets = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  await pool.execute(`UPDATE users SET ${sets} WHERE id = ?`, [...vals, id]);
}

export async function listUsers(societyId = null, includeSuperadmin = false) {
  let query = `
    SELECT DISTINCT u.id, u.email, u.full_name, u.role, u.flat_id, u.is_superadmin, u.created_at
    FROM users u
    LEFT JOIN society_memberships sm ON u.id = sm.user_id
    LEFT JOIN flats f ON u.flat_id = f.id
    WHERE 1=1
  `;
  const params = [];

  if (societyId) {
    if (includeSuperadmin) {
      query += " AND (sm.society_id = ? OR f.society_id = ? OR u.is_superadmin = TRUE)";
      params.push(societyId, societyId);
    } else {
      query += " AND (sm.society_id = ? OR f.society_id = ?)";
      params.push(societyId, societyId);
    }
  }

  // Unless explicitly requested by a superadmin, hide superadmins from normal user lists
  if (!includeSuperadmin) {
    query += " AND u.is_superadmin = FALSE";
  }

  query += " ORDER BY u.id ASC";
  const [rows] = await pool.execute(query, params);
  return rows.map((u) => ({
    ...u,
    is_superadmin: Boolean(u.is_superadmin),
  }));
}

export async function deleteUser(id) {
  // Hard guard: NEVER delete superadmin under any circumstances
  await pool.execute("DELETE FROM users WHERE id = ? AND is_superadmin = FALSE", [id]);
}
