import pool from "../config/db.js";

export async function findBillById(id, societyId = null) {
  let sql = `
    SELECT mb.*, f.wing, f.number AS flat_number, f.bhk, f.area_sqft, f.occupancy_type,
           ur.id AS reconciliation_id, ur.utr, ur.status AS reconciliation_status
    FROM maintenance_bills mb
    JOIN flats f ON mb.flat_id = f.id
    LEFT JOIN upi_reconciliations ur ON ur.bill_id = mb.id AND ur.status IN ('SUBMITTED', 'VERIFIED')
    WHERE mb.id = ?
  `;
  const params = [id];
  if (societyId) {
    sql += " AND mb.society_id = ?";
    params.push(societyId);
  }
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

export async function findBillsByFlat(flatId, societyId = null) {
  let sql = `
    SELECT mb.*, f.wing, f.number AS flat_number, f.bhk, f.area_sqft, f.occupancy_type,
           ur.id AS reconciliation_id, ur.utr, ur.status AS reconciliation_status,
           ur.created_at AS utr_submitted_at
    FROM maintenance_bills mb
    JOIN flats f ON mb.flat_id = f.id
    LEFT JOIN upi_reconciliations ur ON ur.bill_id = mb.id AND ur.status IN ('SUBMITTED', 'VERIFIED')
    WHERE mb.flat_id = ?
  `;
  const params = [flatId];
  if (societyId) {
    sql += " AND mb.society_id = ?";
    params.push(societyId);
  }
  sql += " ORDER BY mb.billing_cycle DESC";
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function listBills(filters = {}) {
  let sql = `
    SELECT mb.*, f.wing, f.number AS flat_number, f.bhk, f.area_sqft, f.occupancy_type,
           ur.id AS reconciliation_id, ur.utr, ur.status AS reconciliation_status
    FROM maintenance_bills mb
    JOIN flats f ON mb.flat_id = f.id
    LEFT JOIN upi_reconciliations ur ON ur.bill_id = mb.id AND ur.status IN ('SUBMITTED', 'VERIFIED')
  `;
  const params = [];
  const clauses = [];
  if (filters.societyId) { clauses.push("mb.society_id = ?"); params.push(filters.societyId); }
  if (filters.status) { clauses.push("mb.status = ?"); params.push(filters.status); }
  if (filters.cycle)  { clauses.push("mb.billing_cycle = ?"); params.push(filters.cycle); }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY mb.billing_cycle DESC, f.wing, f.number";
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function insertBill(bill) {
  const socId = bill.societyId || bill.society_id || 1;
  const [result] = await pool.execute(
    `INSERT INTO maintenance_bills
       (society_id, flat_id, billing_cycle, base_amount, sinking_fund, repair_fund, non_occupancy, late_fee, total_amount, status, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       base_amount = VALUES(base_amount),
       sinking_fund = VALUES(sinking_fund),
       repair_fund = VALUES(repair_fund),
       non_occupancy = VALUES(non_occupancy),
       total_amount = VALUES(total_amount),
       due_date = VALUES(due_date)`,
    [socId, bill.flatId, bill.billingCycle, bill.baseAmount, bill.sinkingFund, bill.repairFund, bill.nonOccupancy, bill.lateFee, bill.totalAmount, bill.status || "PENDING", bill.dueDate]
  );
  return result.insertId || result.id;
}

export async function updateBillStatus(id, status) {
  await pool.execute("UPDATE maintenance_bills SET status = ? WHERE id = ?", [status, id]);
}

export async function insertUpiReconciliation(rec) {
  const socId = rec.societyId || rec.society_id || 1;
  const [result] = await pool.execute(
    `INSERT INTO upi_reconciliations (society_id, bill_id, utr, amount, submitted_by, status)
     VALUES (?, ?, ?, ?, ?, 'SUBMITTED')`,
    [socId, rec.billId, rec.utr, rec.amount, rec.submittedBy]
  );
  return result.insertId;
}

export async function verifyUtr(id, verifiedBy) {
  await pool.execute(
    `UPDATE upi_reconciliations SET status = 'VERIFIED', verified_by = ?, reconciled_at = NOW() WHERE id = ?`,
    [verifiedBy, id]
  );
}

export async function findUpiRecById(id, societyId = null) {
  let sql = "SELECT * FROM upi_reconciliations WHERE id = ?";
  const params = [id];
  if (societyId) {
    sql += " AND society_id = ?";
    params.push(societyId);
  }
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

export async function listPendingReconciliations(societyId = null) {
  let sql = `
    SELECT ur.*, mb.flat_id, mb.billing_cycle, mb.total_amount AS bill_total, f.wing, f.number AS flat_number, f.bhk
    FROM upi_reconciliations ur
    JOIN maintenance_bills mb ON ur.bill_id = mb.id
    JOIN flats f ON mb.flat_id = f.id
    WHERE ur.status = 'SUBMITTED'
  `;
  const params = [];
  if (societyId) {
    sql += " AND mb.society_id = ?";
    params.push(societyId);
  }
  sql += " ORDER BY ur.created_at ASC";
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function findPendingBillsWithDetails(societyId) {
  const sql = `
    SELECT mb.id, mb.society_id, mb.flat_id, mb.billing_cycle, mb.total_amount, mb.status,
           f.wing, f.number AS flat_number, f.bhk,
           u.id AS user_id, u.full_name, u.email
    FROM maintenance_bills mb
    JOIN flats f ON mb.flat_id = f.id
    LEFT JOIN users u ON u.flat_id = f.id
    WHERE mb.society_id = ? AND mb.status IN ('PENDING', 'OVERDUE')
    ORDER BY mb.billing_cycle DESC, f.wing, f.number
  `;
  const [rows] = await pool.execute(sql, [societyId]);
  return rows;
}

export async function findReconciliationsBySociety(societyId) {
  const sql = `
    SELECT ur.*, mb.total_amount AS bill_total, f.wing, f.number AS flat_number, u.full_name
    FROM upi_reconciliations ur
    JOIN maintenance_bills mb ON ur.bill_id = mb.id
    JOIN flats f ON mb.flat_id = f.id
    LEFT JOIN users u ON ur.submitted_by = u.id
    WHERE ur.society_id = ?
    ORDER BY ur.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [societyId]);
  return rows;
}
