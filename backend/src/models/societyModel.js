import pool from "../config/db.js";

export async function listAll() {
  const [rows] = await pool.query(`
    SELECT s.*,
      (SELECT COUNT(*) FROM flats f WHERE f.society_id = s.id) as total_flats,
      (SELECT COUNT(*) FROM wings w WHERE w.society_id = s.id) as total_wings,
      (SELECT COUNT(*) FROM society_memberships sm WHERE sm.society_id = s.id) as total_members
    FROM societies s
    ORDER BY s.name ASC
  `);
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM societies WHERE id = ?", [id]);
  return rows[0] || null;
}

export async function findBySlug(slug) {
  const [rows] = await pool.query("SELECT * FROM societies WHERE slug = ?", [slug]);
  return rows[0] || null;
}

export async function create({
  name,
  slug,
  registrationNumber,
  address,
  city,
  state = "Maharashtra",
  pincode,
  contactEmail,
  contactPhone,
}) {
  const cleanSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const [res] = await pool.execute(
    `INSERT INTO societies (name, slug, registration_number, address, city, state, pincode, contact_email, contact_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [name, cleanSlug, registrationNumber, address, city, state, pincode, contactEmail, contactPhone || null]
  );

  const societyId = res.insertId;

  // Initialize default system settings for this new society
  const defaultSettings = [
    ["MAINTENANCE_MODE", "FLAT_SQFT"],
    ["MAINTENANCE_RATE_SQFT", "5.50"],
    ["FIXED_1BHK", "2500"],
    ["FIXED_2BHK", "3500"],
    ["FIXED_3BHK", "5000"],
    ["SINKING_FUND_PCT", "10"],
    ["REPAIR_FUND_PCT", "5"],
    ["NON_OCCUPANCY_CHARGE_PCT", "10"],
    ["LATE_FEE_GRACE_DAYS", "10"],
    ["LATE_FEE_TYPE", "SIMPLE_PERCENT"],
    ["LATE_FEE_RATE", "18"],
    ["MAKER_CHECKER_THRESHOLD", "15000"],
    ["SOCIETY_UPI_VPA", `${cleanSlug}@icici`],
    ["SOCIETY_BANK_MASK", "ICICI ****0000"],
    ["SOCIETY_GSTIN", "27AAAAA0000A1Z5"],
    ["BILLING_CYCLE_DAY", "1"],
    ["FEATURE_3D_TOWER_VIEW", "true"],
    ["FEATURE_RESIDENT_UPI_SELF_REPORT", "true"],
    ["FEATURE_PUBLIC_VENDOR_RECEIPTS", "true"],
  ];

  for (const [key, val] of defaultSettings) {
    await pool.execute(
      `INSERT INTO system_settings (society_id, setting_key, setting_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [societyId, key, val]
    );
  }

  return societyId;
}

export async function update(id, fields) {
  const allowed = [
    "name",
    "address",
    "city",
    "state",
    "pincode",
    "contact_email",
    "contact_phone",
    "status",
  ];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return;

  const sets = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  await pool.execute(`UPDATE societies SET ${sets} WHERE id = ?`, [...vals, id]);
}

export async function deleteSociety(id) {
  await pool.execute("DELETE FROM societies WHERE id = ?", [id]);
}

export async function getTopology(societyId) {
  const [society] = await pool.query("SELECT * FROM societies WHERE id = ?", [societyId]);
  if (!society.length) return null;

  const [wings] = await pool.query(
    "SELECT * FROM wings WHERE society_id = ? ORDER BY code ASC, name ASC",
    [societyId]
  );

  const [flats] = await pool.query(
    "SELECT * FROM flats WHERE society_id = ? ORDER BY wing ASC, floor ASC, number ASC",
    [societyId]
  );

  return {
    society: society[0],
    wings,
    flats,
  };
}
