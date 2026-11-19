import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import pool from "../config/db.js";
import security from "../config/security.js";

describe("Bank Master Security & Secret Account Masking / Key Rotation", () => {
  let adminToken;
  let residentToken;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { sub: 2, email: "admin@vastuledger.in", role: "ADMIN", societyId: 1 },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );
    residentToken = jwt.sign(
      { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", societyId: 1, flatId: 1 },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );
  });

  afterAll(async () => {
    // Restore default banking settings after tests
    await pool.execute(
      "UPDATE system_settings SET setting_value = 'ICICI ****4521' WHERE society_id = 1 AND setting_key = 'SOCIETY_BANK_MASK'"
    );
    await pool.execute(
      "UPDATE system_settings SET setting_value = '9525621552@upi' WHERE society_id = 1 AND setting_key = 'SOCIETY_UPI_VPA'"
    );
    await pool.execute("DELETE FROM notifications WHERE title LIKE '%Bank Master Rotated%'");
  });

  it("should reject rotation attempt by RESIDENT with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/admin/bank/rotate")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1")
      .send({
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
        accountNumber: "50100456789012",
        confirmAccountNumber: "50100456789012",
        upiVpa: "vastuheights@hdfcbank",
        adminPassword: "WrongPassword",
        reason: "Unauthorized test",
      });

    expect(res.status).toBe(403);
  });

  it("should reject invalid IFSC format or mismatched account numbers", async () => {
    const badIfscRes = await request(app)
      .post("/api/admin/bank/rotate")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1")
      .send({
        bankName: "HDFC Bank",
        ifscCode: "INVALID_IFSC",
        accountNumber: "50100456789012",
        confirmAccountNumber: "50100456789012",
        upiVpa: "vastuheights@hdfcbank",
        adminPassword: "Vastu@2026",
        reason: "Valid AGM resolution",
      });

    expect(badIfscRes.status).toBe(422);

    const mismatchRes = await request(app)
      .post("/api/admin/bank/rotate")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1")
      .send({
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
        accountNumber: "50100456789012",
        confirmAccountNumber: "50100999999999",
        upiVpa: "vastuheights@hdfcbank",
        adminPassword: "Vastu@2026",
        reason: "Valid AGM resolution",
      });

    expect(mismatchRes.status).toBe(422);
  });

  it("should reject rotation when step-up admin password authentication fails", async () => {
    const res = await request(app)
      .post("/api/admin/bank/rotate")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1")
      .send({
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
        accountNumber: "50100456789012",
        confirmAccountNumber: "50100456789012",
        upiVpa: "vastuheights@hdfcbank",
        adminPassword: "IncorrectAdminPassword",
        reason: "Valid AGM resolution #5",
      });

    expect(res.status).toBe(401);
  });

  it("should successfully rotate society bank master on valid admin step-up authentication", async () => {
    const res = await request(app)
      .post("/api/admin/bank/rotate")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1")
      .send({
        bankName: "HDFC Bank",
        ifscCode: "HDFC0001234",
        accountNumber: "50100456789012",
        confirmAccountNumber: "50100456789012",
        upiVpa: "vastuheights@hdfcbank",
        adminPassword: "Vastu@2026",
        reason: "Migrated treasury account to HDFC Baner as per AGM resolution",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.bankMask).toBe("HDFC Bank •••• 9012");
    expect(data.ifscCode).toBe("HDFC0001234");
    expect(data.upiVpa).toBe("vastuheights@hdfcbank");

    // Verify DB settings updated
    const [settings] = await pool.execute(
      "SELECT setting_key, setting_value FROM system_settings WHERE society_id = 1 AND setting_key IN ('SOCIETY_BANK_MASK', 'SOCIETY_UPI_VPA')"
    );
    const map = {};
    for (const s of settings) map[s.setting_key] = s.setting_value;

    expect(map.SOCIETY_BANK_MASK).toBe("HDFC Bank •••• 9012");
    expect(map.SOCIETY_UPI_VPA).toBe("vastuheights@hdfcbank");

    // Verify Audit Trail recorded
    const [audit] = await pool.execute(
      "SELECT * FROM audit_logs WHERE society_id = 1 AND action = 'BANK_ACCOUNT_ROTATED' ORDER BY id DESC LIMIT 1"
    );
    expect(audit.length).toBe(1);
    expect(audit[0].action).toBe("BANK_ACCOUNT_ROTATED");
  });
});
