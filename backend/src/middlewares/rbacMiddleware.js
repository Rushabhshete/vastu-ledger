/**
 * Factory that returns middleware allowing only the listed roles.
 * @param  {...string} allowed  e.g. "ADMIN", "TREASURER"
 */
export default function authorizeRoles(...allowed) {
  return (req, _res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      const err   = new Error("Forbidden — insufficient role");
      err.status  = 403;
      err.title   = "Forbidden";
      return next(err);
    }
    next();
  };
}
