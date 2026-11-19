import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import auditLog from "../middlewares/auditLogger.js";
import { uploadReceipt } from "../middlewares/uploadMiddleware.js";
import * as ctrl from "../controllers/ticketController.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// List tickets & telemetry stats
router.get("/", ctrl.listTickets);

// Create a new helpdesk ticket (with optional photo upload)
router.post(
  "/",
  uploadReceipt.single("photo"),
  validateRequest(ctrl.createTicketSchema),
  ctrl.createTicket
);

// Get single ticket details and comments
router.get("/:id", ctrl.getTicketDetails);

// Update ticket status, assign vendor, or record resolution notes (Management)
router.put(
  "/:id",
  validateRequest(ctrl.updateTicketSchema),
  auditLog("TICKET_UPDATED"),
  ctrl.updateTicketProgress
);

// Close and rate ticket (Resident or Admin)
router.post(
  "/:id/close",
  validateRequest(ctrl.closeTicketSchema),
  auditLog("TICKET_CLOSED"),
  ctrl.closeAndRateTicket
);

// Add comment / progress update
router.post(
  "/:id/comments",
  validateRequest(ctrl.addCommentSchema),
  ctrl.addComment
);

export default router;
