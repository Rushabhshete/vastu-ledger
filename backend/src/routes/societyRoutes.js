import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import * as ctrl from "../controllers/societyController.js";

const router = Router();

// All society routes require authentication
router.use(authenticate);

// 1. Platform-level / Multi-Tenant listing
router.get("/", ctrl.listSocieties);
router.post("/", validateRequest(ctrl.createSocietySchema), ctrl.createSociety);

// 2. Specific Society Routes (scoped via tenant check)
router.use("/:id", requireTenant);

router.get("/:id", ctrl.getSociety);
router.put("/:id", ctrl.updateSociety);
router.get("/:id/topology", ctrl.getTopology);

// Wings Management
router.get("/:id/wings", ctrl.listWings);
router.post("/:id/wings", validateRequest(ctrl.createWingSchema), ctrl.createWing);
router.put("/:id/wings/:wingId", ctrl.updateWing);
router.delete("/:id/wings/:wingId", ctrl.deleteWing);

// Flats Management (Bulk Auto-Generate & Single Entity Alteration)
router.get("/:id/flats", ctrl.listFlats);
router.post("/:id/flats", validateRequest(ctrl.singleFlatSchema), ctrl.createFlat);
router.post("/:id/flats/auto-generate", validateRequest(ctrl.autoGenerateFlatsSchema), ctrl.autoGenerateFlats);
router.put("/:id/flats/:flatId", ctrl.updateFlat);
router.delete("/:id/flats/:flatId", ctrl.deleteFlat);

export default router;
