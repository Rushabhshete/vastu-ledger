import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import auditLog from "../middlewares/auditLogger.js";
import * as ctrl from "../controllers/billingController.js";

const router = Router();

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

export default router;
