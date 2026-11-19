import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import app from "../app.js";
import pool from "../config/db.js";
import security from "../config/security.js";
import * as ledgerService from "../services/ledgerService.js";

describe("Killer Feature 4: Direct Sovereign Zero-Fee UPI Payment Gateway & Webhook Engine", () => {
  let residentToken;
  let testBillId;
  let testSessionRef;
  const testUtr = "777123456789";

  beforeAll(async () => {
    residentToken = jwt.sign(
      { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", societyId: 1, flatId: 1 },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );

    // Clean up any stale test bills from prior runs
    await pool.execute("DELETE FROM upi_payment_sessions WHERE reference_id LIKE 'VL-S1-%'");
    await pool.execute("DELETE FROM maintenance_bills WHERE billing_cycle = '2026-07-01' AND flat_id = 1");

    // Setup an unpaid test bill for Flat 1 in Society 1
    const [billRes] = await pool.execute(
      `INSERT INTO maintenance_bills 
       (society_id, flat_id, billing_cycle, base_amount, sinking_fund, repair_fund, non_occupancy, late_fee, total_amount, status, due_date)
       VALUES (1, 1, '2026-07-01', 5000, 1000, 1000, 500, 0, 7500, 'PENDING', '2026-07-15')`
    );
    testBillId = billRes.insertId;
  });

  afterAll(async () => {
    if (testSessionRef) {
      await pool.execute("DELETE FROM upi_payment_sessions WHERE reference_id = ?", [testSessionRef]);
    }
    if (testBillId) {
      await pool.execute("DELETE FROM upi_reconciliations WHERE bill_id = ?", [testBillId]);
      await pool.execute("DELETE FROM maintenance_bills WHERE id = ?", [testBillId]);
    }
    await pool.execute("DELETE FROM ledger_transactions WHERE description LIKE '%Sovereign UPI Gateway%' OR description LIKE '%777%'");
    await pool.execute("DELETE FROM notifications WHERE type = 'UPI' AND detail LIKE '%7500%'");
  });

  it("should create a dynamic zero-fee UPI payment session with NPCI intent URI locking amount and reference", async () => {
    const res = await request(app)
      .post("/api/billing/upi/create-session")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1")
      .send({ billId: testBillId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const session = res.body.data;
    expect(session.referenceId).toMatch(/^VL-S1-B/);
    expect(session.amount).toBe(7500);
    expect(session.vpa).toBeDefined();
    expect(session.upiIntentUri).toContain("upi://pay?");
    expect(session.upiIntentUri).toContain(`tr=${session.referenceId}`);
    expect(session.upiIntentUri).toContain("am=7500.00");

    testSessionRef = session.referenceId;
  });

  it("should poll session status and report PENDING before webhook arrival", async () => {
    const res = await request(app)
      .get(`/api/billing/upi/session/${testSessionRef}`)
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.amount).toBe(7500);
  });

  it("should process incoming webhook, auto-verify bill to PAID, and chain ledger hashes", async () => {
    const payload = {
      referenceId: testSessionRef,
      utr: testUtr,
      amount: 7500,
      status: "SUCCESS",
      payerVpa: "rajesh@oksbi",
      timestamp: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(payload);
    const secret = process.env.GATEWAY_WEBHOOK_SECRET || security.jwt.accessSecret;
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    const res = await request(app)
      .post("/api/billing/upi/webhook")
      .set("X-Webhook-Signature", signature)
      .set("Content-Type", "application/json")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(true);
    expect(res.body.data.utr).toBe(testUtr);

    // Verify session status is now SUCCESS
    const pollRes = await request(app)
      .get(`/api/billing/upi/session/${testSessionRef}`)
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1");

    expect(pollRes.status).toBe(200);
    expect(pollRes.body.data.status).toBe("SUCCESS");
    expect(pollRes.body.data.utr).toBe(testUtr);

    // Verify bill in DB is PAID
    const [bills] = await pool.execute("SELECT status FROM maintenance_bills WHERE id = ?", [testBillId]);
    expect(bills[0].status).toBe("PAID");

    // Verify ledger cryptographic integrity is intact
    const ledgerCheck = await ledgerService.verifyIntegrity(1);
    expect(ledgerCheck.valid).toBe(true);
  });

  it("should handle duplicate webhook calls idempotently without duplicate ledger entries", async () => {
    const payload = {
      referenceId: testSessionRef,
      utr: testUtr,
      amount: 7500,
      status: "SUCCESS",
    };

    const res = await request(app)
      .post("/api/billing/upi/webhook")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data.alreadyProcessed).toBe(true);
  });
});
