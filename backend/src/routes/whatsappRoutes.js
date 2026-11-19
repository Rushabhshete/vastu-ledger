import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import * as whatsappController from "../controllers/whatsappController.js";

const router = Router();

// ==========================================
// Public Meta Webhook Endpoints (No Bearer)
// ==========================================
router.get("/webhook", whatsappController.verifyWebhook);
router.post("/webhook", whatsappController.handleWebhook);

// ==========================================
// Protected WhatsApp Bot Management Routes
// ==========================================
router.use(authenticate);
router.use(requireTenant);

// Telemetry & Logs
router.get("/stats", authorizeRoles("ADMIN", "TREASURER", "COMMITTEE"), whatsappController.getStats);
router.get("/logs", authorizeRoles("ADMIN", "TREASURER", "COMMITTEE"), whatsappController.listLogs);

// API Credentials & Trigger Settings
router.get("/config", authorizeRoles("ADMIN", "TREASURER"), whatsappController.getConfig);
router.put("/config", authorizeRoles("ADMIN"), whatsappController.updateConfig);

// Manual & Batch Dispatches
router.post("/send-bill/:billId", authorizeRoles("ADMIN", "TREASURER"), whatsappController.sendBillNotification);
router.post("/batch-reminders", authorizeRoles("ADMIN", "TREASURER"), whatsappController.sendBatchDueReminders);
router.post("/broadcast", authorizeRoles("ADMIN", "TREASURER", "COMMITTEE"), whatsappController.sendBroadcast);

export default router;
