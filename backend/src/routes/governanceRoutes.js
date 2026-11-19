import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import requireTenant from "../middlewares/tenantMiddleware.js";
import authorizeRoles from "../middlewares/rbacMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import auditLog from "../middlewares/auditLogger.js";
import * as ctrl from "../controllers/governanceController.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get("/polls",        ctrl.listPolls);
router.get("/agm-package",   ctrl.getAgmPackage);
router.get("/polls/:id",    ctrl.getPoll);

router.post("/polls",
  authorizeRoles("ADMIN", "COMMITTEE"),
  validateRequest(ctrl.createPollSchema),
  auditLog("POLL_CREATED"),
  ctrl.createPoll
);

router.post("/polls/:id/vote",
  validateRequest(ctrl.castVoteSchema),
  auditLog("VOTE_CAST"),
  ctrl.castVote
);

export default router;
