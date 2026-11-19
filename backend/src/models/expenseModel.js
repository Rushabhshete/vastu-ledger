import pool from "../config/db.js";

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ve.*, u1.full_name AS created_by_name, u2.full_name AS approved_by_name
     FROM vendor_expenses ve
     LEFT JOIN users u1 ON ve.created_by = u1.id
     LEFT JOIN users u2 ON ve.approved_by = u2.id
     WHERE ve.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function listExpenses(filters = {}, societyId = null) {
  let sql = `
    SELECT ve.*, u1.full_name AS created_by_name, u2.full_name AS approved_by_name
    FROM vendor_expenses ve
    LEFT JOIN users u1 ON ve.created_by = u1.id
    LEFT JOIN users u2 ON ve.approved_by = u2.id
  `;
  const params = [];
  const clauses = [];

  if (societyId) {
    clauses.push("ve.society_id = ?");
    params.push(societyId);
  }

  if (filters.status) {
    clauses.push("ve.status = ?");
    params.push(filters.status);
  }
  if (filters.category) {
    clauses.push("ve.expense_category = ?");
    params.push(filters.category);
  }

  if (clauses.length) {
    sql += " WHERE " + clauses.join(" AND ");
  }

  sql += " ORDER BY ve.incurred_at DESC, ve.id DESC";
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function insertExpense({
  societyId = 1,
  vendorName,
  expenseCategory,
  description,
  amount,
  gstAmount = 0,
  incurredAt,
  receiptPath,
  status = "PENDING_APPROVAL",
  createdBy,
  approvedBy = null,
}) {
  const [result] = await pool.execute(
    `INSERT INTO vendor_expenses
       (society_id, vendor_name, expense_category, description, amount, gst_amount, incurred_at, receipt_path, status, created_by, approved_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      vendorName,
      expenseCategory,
      description || null,
      amount,
      gstAmount,
      incurredAt,
      receiptPath || null,
      status,
      createdBy,
      approvedBy,
    ]
  );
  return result.insertId;
}

export async function updateExpenseStatus(id, { status, approvedBy = null, rejectionReason = null }) {
  await pool.execute(
    `UPDATE vendor_expenses
     SET status = ?, approved_by = ?, rejection_reason = ?
     WHERE id = ?`,
    [status, approvedBy, rejectionReason, id]
  );
}
