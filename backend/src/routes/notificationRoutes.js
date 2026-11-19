import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import * as ctrl from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get("/", ctrl.list);
router.patch("/read-all", ctrl.markAllRead);
router.patch("/:id/read", ctrl.markRead);

export default router;
