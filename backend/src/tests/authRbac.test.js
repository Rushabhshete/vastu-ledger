import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import security from "../config/security.js";
import * as authService from "../services/authService.js";
import * as userModel from "../models/userModel.js";

describe("Security, Dual-Token Session & RBAC Enforcement", () => {
  it("should issue access token and set HttpOnly refresh cookie on successful login", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      accessToken: "mock.access.jwt.token",
      refreshToken: "mock.refresh.jwt.token",
      user: {
        id: 1,
        email: "admin@vastuledger.in",
        fullName: "Arun Prasad",
        role: "ADMIN",
        flatId: null,
      },
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@vastuledger.in", password: "Vastu@2026" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe("mock.access.jwt.token");
    expect(res.body.data.user.role).toBe("ADMIN");

    // Verify Set-Cookie header contains HttpOnly refresh cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain("vl_refresh_token=");
    expect(cookies[0].toLowerCase()).toContain("httponly");
  });

  it("should reject 401 for requests without Bearer token", async () => {
    const res = await request(app).get("/api/admin/settings");
    expect(res.status).toBe(401);
    expect(res.body.title).toBe("Unauthorized");
  });

  it("should reject 403 Forbidden when RESIDENT accesses ADMIN endpoints", async () => {
    // Generate valid JWT signed for a RESIDENT
    const residentToken = jwt.sign(
      { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", flatId: 1 },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );

    const res = await request(app)
      .get("/api/admin/settings")
      .set("Authorization", `Bearer ${residentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.title).toBe("Forbidden");
    expect(res.body.detail).toContain("Forbidden");
  });

  it("should reject 403 Forbidden when RESIDENT attempts to generate bills", async () => {
    const residentToken = jwt.sign(
      { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", flatId: 1 },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );

    const res = await request(app)
      .post("/api/billing/generate")
      .set("Authorization", `Bearer ${residentToken}`)
      .send({ billingCycle: "2026-04-01" });

    expect(res.status).toBe(403);
  });
});
