import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import { uploadReceipt } from "../middlewares/uploadMiddleware.js";
import * as documentController from "../controllers/documentController.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Compliance scorecard
router.get("/compliance-scorecard", documentController.getComplianceScorecard);

// Documents Vault CRUD
router.get("/", documentController.listDocuments);
router.post("/upload", authorizeRoles("ADMIN", "TREASURER", "COMMITTEE"), uploadReceipt.single("file"), documentController.uploadDocument);
router.delete("/:id", authorizeRoles("ADMIN", "TREASURER"), documentController.deleteDocument);

// Official Notices & Circulars
router.get("/notices", documentController.listNotices);
router.post("/notices", authorizeRoles("ADMIN", "TREASURER", "COMMITTEE"), uploadReceipt.single("attachment"), documentController.createNotice);
router.delete("/notices/:id", authorizeRoles("ADMIN", "TREASURER"), documentController.deleteNotice);

export default router;
