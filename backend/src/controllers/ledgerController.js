import { z } from "zod";
import * as ledgerModel from "../models/ledgerModel.js";
import * as ledgerService from "../services/ledgerService.js";
import * as reportService from "../services/reportService.js";
import { success, created, fail } from "../utils/apiResponse.js";

export const logExpenseSchema = z.object({
  vendorName: z.string().min(2),
  expenseCategory: z.string().min(2),
  description: z.string().optional(),
  amount: z.number().positive(),
  gstAmount: z.number().nonnegative().optional(),
  incurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receiptPath: z.string().optional(),
});

export const rejectExpenseSchema = z.object({
  rejectionReason: z.string().min(3),
});

export async function getTransactions(req, res) {
  const societyId = req.societyId || 1;
  const rows = await ledgerModel.getAll(societyId);
  return success(res, rows);
}

export async function getBalance(req, res) {
  const societyId = req.societyId || 1;
  const balance = await ledgerModel.getBalance(societyId);
  return success(res, { balance });
}

export async function getSummary(req, res) {
  const societyId = req.societyId || 1;
  const summary = await ledgerService.getTreasurySummary(societyId);
  return success(res, summary);
}

export async function getAnalytics(req, res) {
  const societyId = req.societyId || 1;
  const analytics = await ledgerService.getAnalytics(societyId);
  return success(res, analytics);
}

export async function verifyIntegrity(req, res) {
  const societyId = req.societyId || 1;
  const result = await ledgerService.verifyIntegrity(societyId);
  return success(res, result);
}

export async function getAgmPackage(req, res) {
  const societyId = req.societyId || 1;
  const pack = await reportService.getAgmFinancialPack(societyId);
  return success(res, pack);
}

export async function listExpenses(req, res) {
  const { status, category } = req.query;
  const societyId = req.societyId || 1;
  const expenses = await ledgerService.listExpenses({ status, category }, req.user?.role, societyId);
  return success(res, expenses);
}

export async function createExpense(req, res) {
  const societyId = req.societyId || 1;
  const result = await ledgerService.logExpense({
    ...req.body,
    societyId,
    createdBy: req.user.id,
  });

  const msg = result.requiresApproval
    ? `Expense of ₹${result.amount} logged — requires Committee co-approval (threshold: ₹${result.threshold})`
    : `Expense of ₹${result.amount} logged and auto-approved to ledger`;

  return created(res, result, msg);
}

export async function approveExpense(req, res) {
  const expenseId = Number(req.params.id);
  const result = await ledgerService.approveExpense(expenseId, req.user.id);
  return success(res, result, "Vendor expense approved and recorded to ledger");
}

export async function rejectExpense(req, res) {
  const expenseId = Number(req.params.id);
  const result = await ledgerService.rejectExpense(expenseId, req.user.id, req.body.rejectionReason);
  return success(res, result, "Vendor expense rejected");
}

export async function uploadReceiptFile(req, res) {
  if (!req.file) {
    return fail(res, "No invoice/receipt file provided", 400);
  }
  const relativePath = `/uploads/receipts/${req.file.filename}`;
  return success(
    res,
    {
      receiptPath: relativePath,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
    "Receipt uploaded successfully"
  );
}
