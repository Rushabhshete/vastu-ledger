/**
 * Standardised JSON response helpers.
 */
export function success(res, data = null, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function created(res, data = null, message = "Created") {
  return success(res, data, message, 201);
}

export function fail(res, message = "Bad Request", statusCode = 400, errors = null) {
  return res.status(statusCode).json({ success: false, message, errors });
}
