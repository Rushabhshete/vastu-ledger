import jwt from "jsonwebtoken";
import security from "../config/security.js";

/**
 * Verifies the Bearer access token and attaches req.user.
 */
export default function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    const err   = new Error("Authentication required");
    err.status  = 401;
    err.title   = "Unauthorized";
    return next(err);
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, security.jwt.accessSecret);
    req.user = {
      id:           decoded.sub,
      email:        decoded.email,
      role:         decoded.role,
      flatId:       decoded.flatId,
      fullName:     decoded.fullName,
      isSuperadmin: Boolean(decoded.isSuperadmin),
    };
    next();
  } catch {
    const err   = new Error("Invalid or expired token");
    err.status  = 401;
    err.title   = "Unauthorized";
    next(err);
  }
}
