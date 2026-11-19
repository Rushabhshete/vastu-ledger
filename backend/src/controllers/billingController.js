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
