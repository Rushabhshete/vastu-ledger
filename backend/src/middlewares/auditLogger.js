import pool from "../config/db.js";

/**
 * Middleware factory — logs mutating requests to the audit_logs table.
 * @param {string} action  Human-readable action label, e.g. "EXPENSE_CREATED"
 */
export default function auditLog(action) {
  return async (req, _res, next) => {
    // Fire-and-forget — never block the response
    if (req.user) {
      let details = req.auditEntity?.details;
      if (!details && req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
        const safe = { ...req.body };
        delete safe.password;
        delete safe.confirmPassword;
        delete safe.token;
        delete safe.refreshToken;
        details = safe;
      }

      const entityId =
        req.auditEntity?.id ||
        (req.params?.id && !isNaN(Number(req.params.id)) ? Number(req.params.id) : null);

      pool
        .execute(
          `INSERT INTO audit_logs (society_id, user_id, action, entity_type, entity_id, details, ip_address)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.societyId || null,
            req.user.id,
            action,
            req.auditEntity?.type || null,
            entityId,
            details ? JSON.stringify(details) : null,
            req.ip,
          ]
        )
        .catch((err) => console.error("[AuditLog]", err.message));
    }
    next();
  };
}
