import { ZodError } from "zod";

/**
 * Returns Express middleware that validates req[source] against a Zod schema.
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"query"|"params"} source
 */
export default function validateRequest(schema, source = "body") {
  return (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const e   = new Error("Validation failed");
        e.status  = 422;
        e.title   = "Unprocessable Entity";
        e.errors  = err.errors.map((z) => ({
          path:    z.path.join("."),
          message: z.message,
        }));
        next(e);
      } else {
        next(err);
      }
    }
  };
}
