import { z } from "zod";
import * as billingService from "../services/billingService.js";
import * as billingModel from "../models/billingModel.js";
import * as reconciliationService from "../services/reconciliationService.js";
import { success, created, fail } from "../utils/apiResponse.js";

export const generateBillsSchema = z.object({
  billingCycle: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const submitUtrSchema = z.object({
  billId: z.number().int().positive(),
  utr:    z.string().min(10).max(22),
  amount: z.number().positive(),
});

export const batchReconcileSchema = z.object({
  items: z
    .array(
      z.object({
        billId: z.number().int().positive().nullable().optional(),
        reconciliationId: z.number().int().positive().nullable().optional(),
        amount: z.number().positive(),
        extractedUtr: z.string().nullable().optional(),
      })
    )
    .min(1, "At least one item must be selected for reconciliation"),
});

export async function generateBills(req, res) {
  const societyId = req.societyId || 1;
  const bills = await billingService.generateMonthlyBills(societyId, req.body.billingCycle);
  return created(res, bills, `Generated ${bills.length} bills`);
}

export async function listBills(req, res) {
  const { status, cycle } = req.query;
  const societyId = req.societyId || 1;
  const bills = await billingModel.listBills({ status, cycle, societyId });
  return success(res, bills);
}

export async function myBills(req, res) {
  if (!req.user.flatId) return fail(res, "No flat assigned", 400);
  const societyId = req.societyId || 1;
  const bills = await billingModel.findBillsByFlat(req.user.flatId, societyId);
  return success(res, bills);
}

export async function calculateLateFee(req, res) {
  const billId = Number(req.params.id);
  const fee = await billingService.calculateLateFee(billId);
  return success(res, { billId, lateFee: fee });
}

export async function submitUtr(req, res) {
  const societyId = req.societyId || 1;
  const id = await reconciliationService.submitUtr({
    societyId,
    billId:      req.body.billId,
    utr:         req.body.utr,
    amount:      req.body.amount,
    submittedBy: req.user.id,
  });
  return created(res, { reconciliationId: id });
}

export async function listPendingReconciliations(req, res) {
  const societyId = req.societyId || 1;
  const recs = await billingModel.listPendingReconciliations(societyId);
  return success(res, recs);
}

export async function verifyUtr(req, res) {
  const result = await reconciliationService.verifyAndReconcile(
    Number(req.params.id),
    req.user.id
  );
  return success(res, result, "Payment verified and ledger updated");
}

export async function previewBankStatement(req, res) {
  if (!req.file || !req.file.buffer) {
    return fail(res, "Bank statement file (.csv, .xlsx, .xls) is required", 400);
  }
  const societyId = req.societyId || 1;
  const preview = await reconciliationService.previewBankStatement({
    fileBuffer: req.file.buffer,
    originalFilename: req.file.originalname,
    societyId,
  });
  return success(res, preview, "Bank statement parsed and matched successfully");
}

export async function batchReconcileBankStatement(req, res) {
  const societyId = req.societyId || 1;
  const result = await reconciliationService.batchReconcileBankStatement({
    items: req.body.items,
    societyId,
    verifiedBy: req.user.id,
  });
  return success(res, result, `Successfully auto-reconciled ${result.reconciledCount} payments`);
}
