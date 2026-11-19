import { Router } from "express";
import rateLimit from "express-rate-limit";
import authenticate from "../middlewares/authMiddleware.js";
import validateRequest from "../middlewares/validateRequest.js";
import * as ctrl from "../controllers/authController.js";

const router = Router();

// Rate limiter: generous during dev (500 req / 15m), secure in prod (15 req / 15m)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 15 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

router.post("/login",   authLimiter, validateRequest(ctrl.loginSchema), ctrl.login);
router.post("/refresh", ctrl.refreshToken);
router.post("/logout",  authenticate, ctrl.logout);
router.get("/me",       authenticate, ctrl.me);

export default router;
