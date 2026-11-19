import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import pool from "../config/db.js";
import security from "../config/security.js";

describe("Statutory AGM Financial Pack Exporter Engine", () => {
  let adminToken;
  let residentToken;

  beforeAll(async () => {
    // Generate valid tokens
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

  it("should return the full statutory AGM financial pack via /api/governance/agm-package", async () => {
    const res = await request(app)
      .get("/api/governance/agm-package")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const pack = res.body.data;
    expect(pack).toBeDefined();

    // 1. Society Profile
    expect(pack.society).toBeDefined();
    expect(pack.society.name).toContain("Vastu");
    expect(pack.society.registrationNumber).toBeDefined();

    // 2. Meta & Statutory Reference
    expect(pack.meta).toBeDefined();
    expect(pack.meta.financialYear).toMatch(/^FY \d{4}–\d{2}$/);
    expect(pack.meta.actReference).toContain("Co-operative Societies Act");

    // 3. Treasury & Liquid Balance
    expect(pack.treasury).toBeDefined();
    expect(typeof pack.treasury.currentBalance).toBe("number");
    expect(pack.treasury.summary.transactionCount).toBeGreaterThan(0);

    // 4. Income & Expenditure
    expect(pack.incomeExpenditure).toBeDefined();
    expect(pack.incomeExpenditure.collections).toBeDefined();
    expect(pack.incomeExpenditure.collections.totalCollected).toBeGreaterThan(0);
    expect(pack.incomeExpenditure.expenses).toBeDefined();
    expect(Array.isArray(pack.incomeExpenditure.expenses.itemized)).toBe(true);
    expect(typeof pack.incomeExpenditure.netSurplusOrDeficit).toBe("number");

    // 5. Reserve Funds (MCS Act compliance)
    expect(pack.reserveFunds).toBeDefined();
    expect(typeof pack.reserveFunds.sinkingFundReserve).toBe("number");
    expect(typeof pack.reserveFunds.repairFundReserve).toBe("number");

    // 6. Defaulters Schedule
    expect(pack.defaulters).toBeDefined();
    expect(Array.isArray(pack.defaulters.schedule)).toBe(true);
    expect(typeof pack.defaulters.totalDefaulterArrears).toBe("number");

    // 7. Resolutions Schedule
    expect(pack.resolutions).toBeDefined();
    expect(Array.isArray(pack.resolutions)).toBe(true);
    if (pack.resolutions.length > 0) {
      const res0 = pack.resolutions[0];
      expect(res0.title).toBeDefined();
      expect(res0.quorum).toBeDefined();
      expect(res0.tally).toBeDefined();
    }

    // 8. Cryptographic Proof Certificate
    expect(pack.cryptographicProof).toBeDefined();
    expect(pack.cryptographicProof.valid).toBe(true);
    expect(pack.cryptographicProof.status).toBe("VERIFIED_UNTAMPERED");
    expect(pack.cryptographicProof.genesisHash).toBe("0".repeat(64));
    expect(pack.cryptographicProof.latestBlockHash).toHaveLength(64);
    expect(pack.cryptographicProof.totalAuditedBlocks).toBeGreaterThan(0);

    // 9. Signatories
    expect(Array.isArray(pack.signatories)).toBe(true);
    expect(pack.signatories.length).toBeGreaterThanOrEqual(3);
  });

  it("should also be accessible via /api/ledger/agm-package for transparency", async () => {
    const res = await request(app)
      .get("/api/ledger/agm-package")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.society.name).toContain("Vastu");
  });
});
