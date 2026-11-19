import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import security from "../config/security.js";
import * as auditService from "../services/auditService.js";

describe("Statutory Audit Trail & Compliance Engine", () => {
  const adminToken = jwt.sign(
    { sub: 1, email: "admin@vastuledger.in", role: "ADMIN", societyId: 1 },
    security.jwt.accessSecret,
    { expiresIn: "15m" }
  );

  const residentToken = jwt.sign(
    { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", societyId: 1 },
    security.jwt.accessSecret,
    { expiresIn: "15m" }
  );

  it("should reject 403 Forbidden when RESIDENT tries to access audit logs", async () => {
    const res = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(403);
    expect(res.body.title).toBe("Forbidden");
  });

  it("should return filtered audit logs with pagination metadata for ADMIN", async () => {
    vi.spyOn(auditService, "getAuditLogs").mockResolvedValue({
      logs: [
        {
          id: 1,
          society_id: 1,
          user_id: 1,
          action: "SYSTEM_SETTINGS_UPDATED",
          entity_type: "system_settings",
          entity_id: null,
          details: { key: "MAINTENANCE_RATE_SQFT", new: "5.50", old: "5.00" },
          ip_address: "192.168.1.10",
          occurred_at: new Date().toISOString(),
          full_name: "Arun Prasad",
          email: "admin@vastuledger.in",
          user_role: "ADMIN",
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
      availableActions: ["SYSTEM_SETTINGS_UPDATED", "EXPENSE_CREATED"],
    });

    const res = await request(app)
      .get("/api/admin/audit-logs?action=SYSTEM_SETTINGS_UPDATED&limit=25&offset=0")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.availableActions).toContain("SYSTEM_SETTINGS_UPDATED");
  });
});
