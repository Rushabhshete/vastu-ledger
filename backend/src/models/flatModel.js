import pool from "../config/db.js";

export async function findById(id, societyId = null) {
  let query = `
    SELECT f.*, w.name as wing_name,
      u.id as resident_id, u.full_name as resident_name, u.email as resident_email,
      COALESCE(b_agg.unpaid_amount, 0) as unpaid_amount,
      COALESCE(b_agg.latest_status, 'PAID') as bill_status,
      b_agg.latest_bill_id as latest_bill_id,
      b_agg.latest_billing_cycle as latest_billing_cycle,
      b_agg.latest_total_amount as latest_bill_amount
    FROM flats f
    LEFT JOIN wings w ON f.wing_id = w.id
    LEFT JOIN users u ON u.flat_id = f.id
    LEFT JOIN (
      SELECT 
        flat_id,
        SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_amount ELSE 0 END) AS unpaid_amount,
        CASE 
          WHEN SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) > 0 THEN 'OVERDUE'
          WHEN SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) > 0 THEN 'PENDING'
          ELSE 'PAID'
        END AS latest_status,
        SUBSTRING_INDEX(GROUP_CONCAT(id ORDER BY billing_cycle DESC, id DESC), ',', 1) AS latest_bill_id,
        SUBSTRING_INDEX(GROUP_CONCAT(billing_cycle ORDER BY billing_cycle DESC, id DESC), ',', 1) AS latest_billing_cycle,
        SUBSTRING_INDEX(GROUP_CONCAT(total_amount ORDER BY billing_cycle DESC, id DESC), ',', 1) AS latest_total_amount
      FROM maintenance_bills
      GROUP BY flat_id
    ) b_agg ON b_agg.flat_id = f.id
    WHERE f.id = ?
  `;
  const params = [id];
  if (societyId) {
    query += " AND f.society_id = ?";
    params.push(societyId);
  }
  const [rows] = await pool.execute(query, params);
  return rows[0] || null;
}

export async function listFlats(societyId = null, filter = {}) {
  let query = `
    SELECT f.*, w.name as wing_name,
      u.id as resident_id, u.full_name as resident_name, u.email as resident_email,
      COALESCE(b_agg.unpaid_amount, 0) as unpaid_amount,
      COALESCE(b_agg.latest_status, 'PAID') as bill_status,
      b_agg.latest_bill_id as latest_bill_id,
      b_agg.latest_billing_cycle as latest_billing_cycle,
      b_agg.latest_total_amount as latest_bill_amount
    FROM flats f
    LEFT JOIN wings w ON f.wing_id = w.id
    LEFT JOIN users u ON u.flat_id = f.id
    LEFT JOIN (
      SELECT 
        flat_id,
        SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_amount ELSE 0 END) AS unpaid_amount,
        CASE 
          WHEN SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) > 0 THEN 'OVERDUE'
          WHEN SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) > 0 THEN 'PENDING'
          ELSE 'PAID'
        END AS latest_status,
        SUBSTRING_INDEX(GROUP_CONCAT(id ORDER BY billing_cycle DESC, id DESC), ',', 1) AS latest_bill_id,
        SUBSTRING_INDEX(GROUP_CONCAT(billing_cycle ORDER BY billing_cycle DESC, id DESC), ',', 1) AS latest_billing_cycle,
        SUBSTRING_INDEX(GROUP_CONCAT(total_amount ORDER BY billing_cycle DESC, id DESC), ',', 1) AS latest_total_amount
      FROM maintenance_bills
      GROUP BY flat_id
    ) b_agg ON b_agg.flat_id = f.id
    WHERE 1=1
  `;
  const params = [];

  if (societyId) {
    query += " AND f.society_id = ?";
    params.push(societyId);
  }

  if (filter.wing) {
    query += " AND f.wing = ?";
    params.push(filter.wing);
  }

  if (filter.wingId) {
    query += " AND f.wing_id = ?";
    params.push(filter.wingId);
  }

  if (filter.floor) {
    query += " AND f.floor = ?";
    params.push(Number(filter.floor));
  }

  if (filter.occupancyType) {
    query += " AND f.occupancy_type = ?";
    params.push(filter.occupancyType);
  }

  if (filter.search) {
    query += " AND (f.number LIKE ? OR f.wing LIKE ? OR u.full_name LIKE ?)";
    const term = `%${filter.search}%`;
    params.push(term, term, term);
  }

  query += " ORDER BY f.wing ASC, f.floor ASC, f.number ASC";
  const [rows] = await pool.query(query, params);
  return rows;
}

export async function findByWingNumber(societyId, wing, number) {
  const [rows] = await pool.execute(
    "SELECT * FROM flats WHERE society_id = ? AND wing = ? AND number = ?",
    [societyId, wing, number]
  );
  return rows[0] || null;
}

export async function createFlat({
  societyId,
  wingId = null,
  wing,
  floor = 1,
  number,
  address,
  areaSqft,
  bhk = "2BHK",
  isOccupied = true,
  occupancyType = "OWNER_OCCUPIED",
}) {
  const [result] = await pool.execute(
    `INSERT INTO flats (society_id, wing_id, wing, floor, number, address, area_sqft, bhk, is_occupied, occupancy_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      wingId || null,
      wing.toUpperCase(),
      Number(floor) || 1,
      String(number).trim(),
      address || null,
      Number(areaSqft) || 1000,
      bhk,
      isOccupied !== false,
      occupancyType,
    ]
  );
  return result.insertId;
}

/**
 * Bulk Auto-Generate Flats for a Wing
 * Automatically builds floor-by-floor units (e.g. A-101..A-1004) with customizable defaults.
 */
export async function bulkAutoGenerate({
  societyId,
  wingId,
  wingCode,
  startFloor = 1,
  totalFloors = 5,
  flatsPerFloor = 4,
  defaultBhk = "2BHK",
  defaultAreaSqft = 1100,
  numberPrefix = null, // e.g. "A-" or ""
}) {
  const prefix = numberPrefix !== null ? numberPrefix : `${wingCode.toUpperCase()}-`;
  const generated = [];

  for (let fl = Number(startFloor); fl < Number(startFloor) + Number(totalFloors); fl++) {
    for (let u = 1; u <= Number(flatsPerFloor); u++) {
      const unitNum = u < 10 ? `0${u}` : `${u}`;
      const flatNum = `${prefix}${fl}${unitNum}`;
      generated.push({
        societyId,
        wingId,
        wing: wingCode.toUpperCase(),
        floor: fl,
        number: flatNum,
        address: `Wing ${wingCode.toUpperCase()}, Unit ${flatNum}`,
        areaSqft: Number(defaultAreaSqft) || 1100,
        bhk: defaultBhk,
        isOccupied: true,
        occupancyType: "OWNER_OCCUPIED",
      });
    }
  }

  let insertedCount = 0;
  for (const item of generated) {
    try {
      await pool.execute(
        `INSERT INTO flats (society_id, wing_id, wing, floor, number, address, area_sqft, bhk, is_occupied, occupancy_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE area_sqft = VALUES(area_sqft), bhk = VALUES(bhk)`,
        [
          item.societyId,
          item.wingId,
          item.wing,
          item.floor,
          item.number,
          item.address,
          item.areaSqft,
          item.bhk,
          item.isOccupied,
          item.occupancyType,
        ]
      );
      insertedCount++;
    } catch (err) {
      console.error("[bulkAutoGenerate error]:", err.message);
    }
  }

  return { totalRequested: generated.length, insertedCount };
}

/**
 * Alter ANY single flat entity (number, floor, bhk, area_sqft, occupancy_type, is_occupied, address)
 */
export async function updateFlat(id, societyId, fields) {
  const allowed = [
    "wing_id",
    "wing",
    "floor",
    "number",
    "address",
    "area_sqft",
    "bhk",
    "is_occupied",
    "occupancy_type",
  ];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return;

  const sets = keys.map((k) => `\`${k}\` = ?`).join(", ");
  const vals = keys.map((k) => fields[k]);

  if (societyId) {
    await pool.execute(`UPDATE flats SET ${sets} WHERE id = ? AND society_id = ?`, [...vals, id, societyId]);
  } else {
    await pool.execute(`UPDATE flats SET ${sets} WHERE id = ?`, [...vals, id]);
  }
}

export async function deleteFlat(id, societyId = null) {
  if (societyId) {
    await pool.execute("DELETE FROM flats WHERE id = ? AND society_id = ?", [id, societyId]);
  } else {
    await pool.execute("DELETE FROM flats WHERE id = ?", [id]);
  }
}
