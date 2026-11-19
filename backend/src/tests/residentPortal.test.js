import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import pool from "../config/db.js";
import security from "../config/security.js";
import * as reconciliationService from "../services/reconciliationService.js";

describe("Resident Self-Service Portal & UPI Verification Workflow", () => {
  let residentToken;
  let treasurerToken;

  beforeAll(async () => {
    residentToken = jwt.sign(
      { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", societyId: 1, flatId: 1 },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );

    treasurerToken = jwt.sign(
      { sub: 3, email: "treasurer@vastuledger.in", role: "TREASURER", societyId: 1 },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM upi_reconciliations WHERE utr LIKE '999%'");
    await pool.execute("DELETE FROM notifications WHERE user_id = 5 AND title LIKE '%Receipt Issued%'");
    await pool.execute("DELETE FROM ledger_transactions WHERE id >= 13");
    await pool.execute("UPDATE maintenance_bills SET status = 'PENDING' WHERE id = 1");
  });

  it("should fetch resident's personal flat bills with enriched flat details", async () => {
    const res = await request(app)
      .get("/api/billing/my-bills")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const bill = res.body.data[0];
      expect(bill.flat_id).toBe(1);
      expect(bill.wing).toBeDefined();
      expect(bill.flat_number).toBeDefined();
      expect(bill.bhk).toBeDefined();
      expect(bill.total_amount).toBeDefined();
    }
  });

  it("should allow a resident to submit a 12-digit UPI UTR for reconciliation", async () => {
    // 1. Find a pending bill for flat 1
    const [bills] = await pool.execute(
      "SELECT id, total_amount FROM maintenance_bills WHERE flat_id = 1 AND society_id = 1 LIMIT 1"
    );
    expect(bills.length).toBeGreaterThan(0);
    const targetBill = bills[0];

    const testUtr = `999${Date.now().toString().slice(-9)}`;

    // 2. Resident submits UTR
    const submitRes = await request(app)
      .post("/api/billing/upi/submit")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1")
      .send({
        billId: targetBill.id,
        utr: testUtr,
        amount: Number(targetBill.total_amount),
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.success).toBe(true);
    const recId = submitRes.body.data.reconciliationId;
    expect(recId).toBeDefined();

    // 3. Verify reconciliation status in DB
    const [recs] = await pool.execute(
      "SELECT * FROM upi_reconciliations WHERE id = ?",
      [recId]
    );
    expect(recs.length).toBe(1);
    expect(recs[0].utr).toBe(testUtr);
    expect(recs[0].status).toBe("SUBMITTED");
    expect(recs[0].submitted_by).toBe(5);

    // 4. Treasurer verifies and reconciles the UTR via endpoint
    const verifyRes = await request(app)
      .post(`/api/billing/upi/verify/${recId}`)
      .set("Authorization", `Bearer ${treasurerToken}`)
      .set("X-Society-Id", "1");

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.billId).toBe(targetBill.id);

    // 5. Verify bill is now PAID and notification was triggered
    const [updatedBills] = await pool.execute(
      "SELECT status FROM maintenance_bills WHERE id = ?",
      [targetBill.id]
    );
    expect(updatedBills[0].status).toBe("PAID");

    // 6. Check that notification was routed to the resident user
    const [notifications] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = 5 AND type = 'UPI' ORDER BY id DESC LIMIT 1"
    );
    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toContain("Receipt Issued");

    // 7. Verify cryptographic chain integrity remained valid after reconciliation
    const integrityRes = await request(app)
      .get("/api/ledger/verify")
      .set("Authorization", `Bearer ${treasurerToken}`)
      .set("X-Society-Id", "1");
    expect(integrityRes.body.data.valid).toBe(true);
  });
});
