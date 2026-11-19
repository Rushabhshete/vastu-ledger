import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import auditLog from "../middlewares/auditLogger.js";
import { uploadReceipt } from "../middlewares/uploadMiddleware.js";
import * as ctrl from "../controllers/ledgerController.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Public transparency / read-only ledger
router.get("/", ctrl.getTransactions);
router.get("/balance", ctrl.getBalance);
router.get("/summary", ctrl.getSummary);
router.get("/analytics", ctrl.getAnalytics);
router.get("/agm-package", ctrl.getAgmPackage);
router.get("/verify", authorizeRoles("ADMIN", "TREASURER", "COMMITTEE"), ctrl.verifyIntegrity);

// Vendor Expense Vault routes
router.get("/expenses", ctrl.listExpenses);

// Uploading vendor invoice proof / receipt
router.post(
  "/upload-receipt",
  authorizeRoles("ADMIN", "TREASURER"),
  uploadReceipt.single("receipt"),
  ctrl.uploadReceiptFile
);

// Logging expense: Treasurer or Admin
router.post(
  "/expenses",
  authorizeRoles("ADMIN", "TREASURER"),
  validateRequest(ctrl.logExpenseSchema),
  auditLog("VENDOR_EXPENSE_LOGGED"),
  ctrl.createExpense
);

// Approving high-value expense: Committee or Admin (Maker-Checker co-signing)
router.post(
  "/expenses/:id/approve",
  authorizeRoles("ADMIN", "COMMITTEE"),
  auditLog("VENDOR_EXPENSE_APPROVED"),
  ctrl.approveExpense
);

// Rejecting high-value expense: Committee or Admin
router.post(
  "/expenses/:id/reject",
  authorizeRoles("ADMIN", "COMMITTEE"),
  validateRequest(ctrl.rejectExpenseSchema),
  auditLog("VENDOR_EXPENSE_REJECTED"),
  ctrl.rejectExpense
);

export default router;
