import pool from "../config/db.js";
import * as ledgerModel from "../models/ledgerModel.js";
import * as expenseModel from "../models/expenseModel.js";
import * as configModel from "../models/configModel.js";
import { notifyExpenseRequiresApproval } from "./notificationService.js";
import { computeRowHash, verifyChain, GENESIS_HASH } from "../utils/ledgerHash.js";

/**
 * Log a vendor expense. If amount exceeds MAKER_CHECKER_THRESHOLD, it requires COMMITTEE approval.
 * Otherwise, it auto-approves and writes immediately to the tamper-evident ledger.
 */
export async function logExpense({
  societyId = 1,
  vendorName,
  expenseCategory,
  description,
  amount,
  gstAmount = 0,
  incurredAt,
  receiptPath,
  createdBy,
}) {
  const thresholdVal = await configModel.get("MAKER_CHECKER_THRESHOLD", societyId);
  const threshold = thresholdVal ? Number(thresholdVal) : 15000;

  const requiresApproval = Number(amount) > threshold;
  const status = requiresApproval ? "PENDING_APPROVAL" : "APPROVED";
  const approvedBy = requiresApproval ? null : createdBy;

  const expenseId = await expenseModel.insertExpense({
    societyId,
    vendorName,
    expenseCategory,
    description,
    amount,
    gstAmount,
    incurredAt,
    receiptPath,
    status,
    createdBy,
    approvedBy,
  });

  let ledgerId = null;

  if (requiresApproval) {
    // Notify committee members and admins of pending high-value expense
    notifyExpenseRequiresApproval({
      societyId,
      vendorName,
      amount: Number(amount),
      threshold,
      expenseId,
    });
  } else {
    // Auto-approved expense writes directly into ledger with atomic hash chaining
    const tx = await ledgerModel.appendTransaction({
      societyId,
      transactionType: "DEBIT",
      category: "VENDOR_EXPENSE",
      referenceType: "vendor_expense",
      referenceId: expenseId,
      description: `${vendorName} — ${expenseCategory} (${description || "Vendor Payment"})`,
      amount: Number(amount),
      createdBy,
    });
    ledgerId = tx.insertId;
  }

  return {
    expenseId,
    status,
    requiresApproval,
    ledgerId,
    amount: Number(amount),
    threshold,
  };
}

/**
 * Committee member or Admin approves a high-value pending vendor expense.
 * Appends a DEBIT transaction to the tamper-evident hash-chained ledger.
 */
export async function approveExpense(expenseId, approvedBy) {
  const expense = await expenseModel.findById(expenseId);
  if (!expense) {
    throw Object.assign(new Error("Vendor expense not found"), { status: 404 });
  }

  if (expense.status !== "PENDING_APPROVAL") {
    throw Object.assign(new Error(`Expense cannot be approved from status '${expense.status}'`), { status: 409 });
  }

  await expenseModel.updateExpenseStatus(expenseId, {
    status: "APPROVED",
    approvedBy,
  });

  const societyId = expense.society_id || 1;
  const tx = await ledgerModel.appendTransaction({
    societyId,
    transactionType: "DEBIT",
    category: "VENDOR_EXPENSE",
    referenceType: "vendor_expense",
    referenceId: expenseId,
    description: `${expense.vendor_name} — ${expense.expense_category} (${expense.description || "Vendor Payment"})`,
    amount: Number(expense.amount),
    createdBy: approvedBy,
  });

  return {
    expenseId,
    status: "APPROVED",
    ledgerId: tx.insertId,
    balanceAfter: tx.balanceAfter,
  };
}

/**
 * Committee member or Admin rejects an expense.
 */
export async function rejectExpense(expenseId, rejectedBy, rejectionReason) {
  const expense = await expenseModel.findById(expenseId);
  if (!expense) {
    throw Object.assign(new Error("Vendor expense not found"), { status: 404 });
  }

  if (expense.status !== "PENDING_APPROVAL") {
    throw Object.assign(new Error(`Expense cannot be rejected from status '${expense.status}'`), { status: 409 });
  }

  await expenseModel.updateExpenseStatus(expenseId, {
    status: "REJECTED",
    approvedBy: rejectedBy,
    rejectionReason,
  });

  return {
    expenseId,
    status: "REJECTED",
    rejectionReason,
  };
}

/**
 * List vendor expenses with optional filters.
 */
export async function listExpenses(filters = {}, userRole = "ADMIN", societyId = null) {
  const expenses = await expenseModel.listExpenses(filters, societyId);

  // If public receipts toggle is off and user is resident, hide sensitive receipt paths
  if (userRole === "RESIDENT") {
    const publicReceipts = await configModel.get("FEATURE_PUBLIC_VENDOR_RECEIPTS", societyId || 1);
    if (publicReceipts === "false") {
      return expenses.map((e) => ({ ...e, receipt_path: null }));
    }
  }

  return expenses;
}

/**
 * Full SHA-256 hash chain verification of all ledger entries for a society.
 */
export async function verifyIntegrity(societyId = null) {
  const rows = await ledgerModel.getAll(societyId);
  return verifyChain(rows);
}

/**
 * Summary metrics for Treasury Command Center:
 * Current balance, total inflows, total outflows, transaction count.
 */
export async function getTreasurySummary(societyId = null) {
  const rows = await ledgerModel.getAll(societyId);
  const currentBalance = await ledgerModel.getBalance(societyId);

  let totalCredit = 0;
  let totalDebit = 0;

  for (const row of rows) {
    const amt = Number(row.amount);
    if (row.transaction_type === "CREDIT") {
      totalCredit += amt;
    } else if (row.transaction_type === "DEBIT") {
      totalDebit += amt;
    }
  }

  return {
    currentBalance,
    totalCredit: Math.round(totalCredit * 100) / 100,
    totalDebit: Math.round(totalDebit * 100) / 100,
    transactionCount: rows.length,
  };
}

/**
 * Real-time Treasury Analytics for Command Center:
 * 1. Monthly Inflows vs Outflows (Cashflow trend)
 * 2. Expense Category Distribution (Pie chart)
 */
export async function getAnalytics(societyId = 1) {
  const [cashflow] = await pool.execute(
    `SELECT 
       DATE_FORMAT(created_at, '%b %y') as month,
       DATE_FORMAT(created_at, '%Y-%m') as ym,
       CAST(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) AS DOUBLE) as inflow,
       CAST(SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) AS DOUBLE) as outflow
     FROM ledger_transactions
     WHERE society_id = ?
     GROUP BY ym, month
     ORDER BY ym ASC
     LIMIT 12`,
    [societyId]
  );

  const [distribution] = await pool.execute(
    `SELECT 
       expense_category as name,
       CAST(SUM(amount) AS DOUBLE) as value
     FROM vendor_expenses
     WHERE society_id = ?
     GROUP BY expense_category
     ORDER BY value DESC`,
    [societyId]
  );

  const CATEGORY_COLORS = {
    "Elevator AMC": "#F59E0B",
    "AMC": "#F59E0B",
    "Common Area Electricity": "#14B8A6",
    "Electricity": "#14B8A6",
    "Security Payroll": "#3B82F6",
    "Payroll": "#3B82F6",
    "Waterproofing Advance": "#EC4899",
    "Waterproofing": "#EC4899",
    "RO Water Servicing": "#8B5CF6",
    "RO Service": "#8B5CF6",
    "Plumbing": "#06B6D4",
    "Security": "#10B981",
    "Clubhouse": "#F97316",
    "Audit & Legal": "#6366F1",
    "General Maintenance": "#64748B",
  };

  const PALETTE = ["#F59E0B", "#14B8A6", "#3B82F6", "#EC4899", "#8B5CF6", "#10B981", "#06B6D4", "#F97316", "#6366F1", "#64748B"];

  const formattedDistribution = (distribution || []).map((item, index) => ({
    name: item.name,
    value: Number(item.value) || 0,
    color: CATEGORY_COLORS[item.name] || PALETTE[index % PALETTE.length],
  }));

  return {
    cashflow: cashflow || [],
    expenseDistribution: formattedDistribution,
  };
}
