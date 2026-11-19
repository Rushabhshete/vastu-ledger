import { Router } from "express";
import authRoutes from "./authRoutes.js";
import billingRoutes from "./billingRoutes.js";
import ledgerRoutes from "./ledgerRoutes.js";
import governanceRoutes from "./governanceRoutes.js";
import adminRoutes from "./adminRoutes.js";
import societyRoutes from "./societyRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

const router = Router();

router.use("/auth",          authRoutes);
router.use("/billing",       billingRoutes);
router.use("/ledger",        ledgerRoutes);
router.use("/governance",    governanceRoutes);
router.use("/admin",         adminRoutes);
router.use("/societies",     societyRoutes);
router.use("/notifications", notificationRoutes);

export default router;
