import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import auditLog from "../middlewares/auditLogger.js";
import * as ctrl from "../controllers/adminController.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(authorizeRoles("ADMIN"));

router.get("/settings",        ctrl.getSettings);
router.put("/settings",        validateRequest(ctrl.updateSettingSchema),  auditLog("SETTING_UPDATED"), ctrl.updateSetting);
router.put("/settings/bulk",   validateRequest(ctrl.bulkUpdateSchema),    auditLog("SETTINGS_BULK_UPDATED"), ctrl.bulkUpdate);
router.post("/bank/rotate",    validateRequest(ctrl.rotateBankMasterSchema), auditLog("BANK_ACCOUNT_ROTATED"), ctrl.rotateBankMaster);
router.get("/audit-logs",      ctrl.getAuditLogs);
router.get("/users",           ctrl.listUsers);
router.post("/users",          validateRequest(ctrl.createUserSchema), auditLog("USER_CREATED"), ctrl.createUser);
router.put("/users/:id",       validateRequest(ctrl.updateUserSchema), auditLog("USER_UPDATED"), ctrl.updateUser);
router.delete("/users/:id",    auditLog("USER_DELETED"), ctrl.deleteUser);

router.get("/flats",           ctrl.listFlats);
router.post("/flats",          validateRequest(ctrl.createFlatSchema), auditLog("FLAT_CREATED"), ctrl.createFlat);
router.put("/flats/:id",       validateRequest(ctrl.updateFlatSchema), auditLog("FLAT_UPDATED"), ctrl.updateFlat);
router.delete("/flats/:id",    auditLog("FLAT_DELETED"), ctrl.deleteFlat);

export default router;
