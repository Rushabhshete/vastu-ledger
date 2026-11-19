import pool from "../config/db.js";

/**
 * Tenant Isolation Middleware (Multi-Tenant Architecture)
 * Validates and attaches the active society_id, societyRole, and flatId to req.
 * If user is SUPERADMIN, grants full access across all societies.
 */
export default async function requireTenant(req, res, next) {
  try {
    const headerSocId = req.headers["x-society-id"];
    const querySocId = req.query.society_id;
    const paramSocId = req.params.societyId || req.params.id;

    let targetSocietyId = Number(headerSocId || paramSocId || querySocId);

    // If no explicit society requested, fallback to default (Society 1)
    if (!targetSocietyId || isNaN(targetSocietyId)) {
      targetSocietyId = 1;
    }

    // 1. SuperAdmin bypass: platform owner can access any society
    if (req.user?.isSuperadmin) {
      req.societyId = targetSocietyId;
      req.societyRole = "ADMIN"; // SuperAdmin acts as Admin inside any tenant
      return next();
    }

    // 2. Regular user: verify membership in this society (Option 1B)
    const [memberships] = await pool.query(
      `SELECT sm.society_id, sm.role, sm.flat_id, s.status, s.name as society_name
       FROM society_memberships sm
       JOIN societies s ON sm.society_id = s.id
       WHERE sm.user_id = ? AND sm.society_id = ?`,
      [req.user.id, targetSocietyId]
    );

    let activeMember = memberships[0];

    // Graceful recovery: If user does not belong to the requested header society (e.g. stale localStorage from another user),
    // automatically fallback to their primary authorized society instead of returning 403
    if (!activeMember) {
      const [fallbackMemberships] = await pool.query(
        `SELECT sm.society_id, sm.role, sm.flat_id, s.status, s.name as society_name
         FROM society_memberships sm
         JOIN societies s ON sm.society_id = s.id
         WHERE sm.user_id = ?
         ORDER BY sm.society_id ASC
         LIMIT 1`,
        [req.user.id]
      );

      if (fallbackMemberships.length > 0) {
        activeMember = fallbackMemberships[0];
        targetSocietyId = activeMember.society_id;
      } else {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not an authorized member of any housing society.",
        });
      }
    }

    if (activeMember.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        message: "This society account is currently suspended. Please contact the platform owner.",
      });
    }

    req.societyId = targetSocietyId;
    req.societyRole = activeMember.role;
    req.flatId = activeMember.flat_id;
    req.societyName = activeMember.society_name;

    next();
  } catch (err) {
    next(err);
  }
}
