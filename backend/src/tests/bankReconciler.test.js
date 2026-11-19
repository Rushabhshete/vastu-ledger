import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import pool from "../config/db.js";
import security from "../config/security.js";
import * as ledgerService from "../services/ledgerService.js";

describe("Killer Feature 1: Bank Statement Excel / CSV Auto-Reconciler", () => {
  let residentToken;
  let treasurerToken;
  let testBill1Id;
  let testBill2Id;
  let testRec1Id;

  const testUtr1 = "888123456789";
  const testUtr2 = "888987654321";

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

    // Clean up any stale test bills from prior runs
    await pool.execute("DELETE FROM upi_reconciliations WHERE utr IN (?, ?)", [testUtr1, testUtr2]);
    await pool.execute("DELETE FROM maintenance_bills WHERE billing_cycle = '2026-06-01' AND flat_id IN (1, 2)");

    // Setup clean test bills for Flat 1 and Flat 2 in Society 1
    // Bill 1: PENDING ₹7590 for Flat 1 with a SUBMITTED UTR (Direct Match)
    const [bill1Res] = await pool.execute(
      `INSERT INTO maintenance_bills 
       (society_id, flat_id, billing_cycle, base_amount, sinking_fund, repair_fund, non_occupancy, late_fee, total_amount, status, due_date)
       VALUES (1, 1, '2026-06-01', 5000, 1000, 1000, 590, 0, 7590, 'PENDING', '2026-06-15')`
    );
    testBill1Id = bill1Res.insertId;

    const [rec1Res] = await pool.execute(
      `INSERT INTO upi_reconciliations (society_id, bill_id, utr, amount, submitted_by, status)
       VALUES (1, ?, ?, 7590, 5, 'SUBMITTED')`,
      [testBill1Id, testUtr1]
    );
    testRec1Id = rec1Res.insertId;

    // Bill 2: PENDING ₹6000 for Flat 2 without submitted UTR (Smart Flat Match: Wing A, 102)
    const [bill2Res] = await pool.execute(
      `INSERT INTO maintenance_bills 
       (society_id, flat_id, billing_cycle, base_amount, sinking_fund, repair_fund, non_occupancy, late_fee, total_amount, status, due_date)
       VALUES (1, 2, '2026-06-01', 4000, 1000, 1000, 0, 0, 6000, 'PENDING', '2026-06-15')`
    );
    testBill2Id = bill2Res.insertId;
  });

  afterAll(async () => {
    // Idempotent cleanup
    if (testRec1Id) {
      await pool.execute("DELETE FROM upi_reconciliations WHERE id = ? OR utr LIKE '888%'", [testRec1Id]);
    }
    if (testBill1Id) {
      await pool.execute("DELETE FROM maintenance_bills WHERE id = ?", [testBill1Id]);
    }
    if (testBill2Id) {
      await pool.execute("DELETE FROM maintenance_bills WHERE id = ?", [testBill2Id]);
    }
    await pool.execute("DELETE FROM ledger_transactions WHERE description LIKE '%Auto-Reconciled%' OR description LIKE '%888%'");
    await pool.execute("DELETE FROM notifications WHERE title LIKE '%Receipt Issued%' AND (detail LIKE '%7590%' OR detail LIKE '%6000%')");
  });

  it("should reject statement upload and preview when accessed by RESIDENT (403)", async () => {
    const fakeCsv = "Txn Date,Narration,Credit\n02/05/2026,UPI/888123456789,7590.00";
    const res = await request(app)
      .post("/api/billing/reconcile/bank-statement/preview")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("X-Society-Id", "1")
      .attach("statement", Buffer.from(fakeCsv), "statement.csv");

    expect(res.status).toBe(403);
  });

  it("should parse bank statement CSV and return preview with direct and smart matches", async () => {
    const csvContent = [
      "Txn Date,Particulars,Ref No,Debit,Credit,Balance",
      // Row 1: Direct UTR match against testBill1Id
      `02/06/2026,UPI/CR/${testUtr1}/RAJESH KULKARNI/OKAXIS,${testUtr1},,7590.00,107590.00`,
      // Row 2: Smart Match (Narration contains A-204 and exact ₹6000 amount, UTR not self-submitted)
      `03/06/2026,UPI-CR-${testUtr2}-FLAT A-204 MAINTENANCE,${testUtr2},,6000.00,113590.00`,
      // Row 3: Debit transaction (should be ignored)
      "04/06/2026,LIFT AMC QUARTERLY PAYMENT,CHQ-10045,25000.00,,88590.00",
      // Row 4: Unmatched bank credit (Bank Interest)
      "05/06/2026,Q1 SAVINGS BANK INTEREST CREDIT,REF-INT-99,,1450.00,90040.00",
    ].join("\n");

    const res = await request(app)
      .post("/api/billing/reconcile/bank-statement/preview")
      .set("Authorization", `Bearer ${treasurerToken}`)
      .set("X-Society-Id", "1")
      .attach("statement", Buffer.from(csvContent), "hdfc_june_statement.csv");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const preview = res.body.data;
    expect(preview.totalCredits).toBe(3); // 3 credits, 1 debit skipped
    expect(preview.matchedCount).toBeGreaterThanOrEqual(2);

    // Verify Row 1: MATCHED_UTR
    const directMatch = preview.items.find((it) => it.extractedUtr === testUtr1);
    expect(directMatch).toBeDefined();
    expect(directMatch.status).toBe("MATCHED_UTR");
    expect(directMatch.matchType).toBe("DIRECT_UTR");
    expect(directMatch.billId).toBe(testBill1Id);
    expect(directMatch.reconciliationId).toBe(testRec1Id);
    expect(directMatch.selected).toBe(true);

    // Verify Row 2: SMART_MATCH
    const smartMatch = preview.items.find((it) => it.extractedUtr === testUtr2);
    expect(smartMatch).toBeDefined();
    expect(smartMatch.status).toBe("SMART_MATCH");
    expect(smartMatch.matchType).toBe("SMART_FLAT_AMOUNT");
    expect(smartMatch.billId).toBe(testBill2Id);
    expect(smartMatch.amount).toBe(6000);
    expect(smartMatch.selected).toBe(true);

    // Verify Row 4: UNMATCHED
    const unmatched = preview.items.find((it) => it.narration.includes("SAVINGS BANK INTEREST"));
    expect(unmatched).toBeDefined();
    expect(unmatched.status).toBe("UNMATCHED");
    expect(unmatched.selected).toBe(false);
  });

  it("should atomically batch reconcile selected items, update bills to PAID, and chain ledger hashes", async () => {
    const payload = {
      items: [
        {
          billId: testBill1Id,
          reconciliationId: testRec1Id,
          amount: 7590,
          extractedUtr: testUtr1,
        },
        {
          billId: testBill2Id,
          reconciliationId: null, // Smart match (system generates verified record)
          amount: 6000,
          extractedUtr: testUtr2,
        },
      ],
    };

    const res = await request(app)
      .post("/api/billing/reconcile/bank-statement/commit")
      .set("Authorization", `Bearer ${treasurerToken}`)
      .set("X-Society-Id", "1")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reconciledCount).toBe(2);
    expect(res.body.data.totalAmount).toBe(13590);

    // Verify both bills in DB are now PAID
    const [bills] = await pool.execute(
      "SELECT id, status FROM maintenance_bills WHERE id IN (?, ?)",
      [testBill1Id, testBill2Id]
    );
    expect(bills.length).toBe(2);
    expect(bills.every((b) => b.status === "PAID")).toBe(true);

    // Verify ledger integrity remains 100% valid with tamper-evident chaining
    const ledgerCheck = await ledgerService.verifyIntegrity(1);
    expect(ledgerCheck.valid).toBe(true);
  });
});
