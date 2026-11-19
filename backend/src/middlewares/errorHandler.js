/**
 * Centralised error handler — returns RFC-7807 problem+json.
 * Express 5 automatically catches async errors, so no wrapper needed.
 */
export default function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const title  = err.title  || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[ErrorHandler]", err);
  }

  res.status(status).json({
    type:   "about:blank",
    title,
    status,
    detail: err.message || "An unexpected error occurred",
    ...(err.errors && { errors: err.errors }),
  });
}
