import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import auditLog from "../middlewares/auditLogger.js";
import { uploadBankStatement } from "../middlewares/uploadMiddleware.js";
import * as ctrl from "../controllers/billingController.js";

const router = Router();

// Public Webhook for Zero-Fee UPI Gateway / Bank Callbacks (PhonePe, Paytm, UPILerify, Bank Webhook)
router.post(
  "/upi/webhook",
  auditLog("UPI_GATEWAY_WEBHOOK_PROCESSED"),
  ctrl.processGatewayWebhook
);

router.use(authenticate);
router.use(requireTenant);

router.post("/generate",
  authorizeRoles("ADMIN", "TREASURER"),
  validateRequest(ctrl.generateBillsSchema),
  auditLog("BILLS_GENERATED"),
  ctrl.generateBills
);

router.get("/", authorizeRoles("ADMIN", "TREASURER", "COMMITTEE"), ctrl.listBills);
router.get("/my-bills", ctrl.myBills);
router.get("/:id/late-fee", ctrl.calculateLateFee);

router.post("/upi/submit", validateRequest(ctrl.submitUtrSchema), ctrl.submitUtr);

router.get("/upi/pending", authorizeRoles("ADMIN", "TREASURER"), ctrl.listPendingReconciliations);
router.post("/upi/verify/:id",
  authorizeRoles("ADMIN", "TREASURER"),
  auditLog("UPI_VERIFIED"),
  ctrl.verifyUtr
);

// Sovereign Zero-Fee UPI Payment Gateway Endpoints
router.post(
  "/upi/create-session",
  validateRequest(ctrl.createPaymentSessionSchema),
  ctrl.createPaymentSession
);

router.get("/upi/session/:referenceId", ctrl.getSessionStatus);

// Bank Statement Auto-Reconciler Endpoints
router.post(
  "/reconcile/bank-statement/preview",
  authorizeRoles("ADMIN", "TREASURER"),
  uploadBankStatement.single("statement"),
  ctrl.previewBankStatement
);

router.post(
  "/reconcile/bank-statement/commit",
  authorizeRoles("ADMIN", "TREASURER"),
  validateRequest(ctrl.batchReconcileSchema),
  auditLog("BANK_STATEMENT_BATCH_RECONCILED"),
  ctrl.batchReconcileBankStatement
);

export default router;
