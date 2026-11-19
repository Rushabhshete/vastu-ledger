import { describe, it, expect, vi } from "vitest";
import { computeRowHash, verifyChain, GENESIS_HASH } from "../utils/ledgerHash.js";
import * as ledgerService from "../services/ledgerService.js";
import * as configModel from "../models/configModel.js";
import * as expenseModel from "../models/expenseModel.js";
import * as ledgerModel from "../models/ledgerModel.js";

describe("Ledger Cryptographic Integrity & Maker-Checker Workflows", () => {
  it("should compute valid SHA-256 row hashes and verify an intact chain", () => {
    const t1Date = "2026-01-01T10:00:00.000Z";
    const h1 = computeRowHash({
      prevHash: GENESIS_HASH,
      transactionId: 1,
      amount: 7590,
      transactionType: "CREDIT",
      createdAt: t1Date,
    });

    const t2Date = "2026-01-02T12:00:00.000Z";
    const h2 = computeRowHash({
      prevHash: h1,
      transactionId: 2,
      amount: 9488,
      transactionType: "CREDIT",
      createdAt: t2Date,
    });

    const chain = [
      { id: 1, prev_hash: GENESIS_HASH, row_hash: h1, amount: 7590, transaction_type: "CREDIT", created_at: t1Date },
      { id: 2, prev_hash: h1, row_hash: h2, amount: 9488, transaction_type: "CREDIT", created_at: t2Date },
    ];

    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
  });

  it("should detect unauthorized direct tampering of amount or transaction and break chain", () => {
    const t1Date = "2026-01-01T10:00:00.000Z";
    const h1 = computeRowHash({
      prevHash: GENESIS_HASH,
      transactionId: 1,
      amount: 7590,
      transactionType: "CREDIT",
      createdAt: t1Date,
    });

    const t2Date = "2026-01-02T12:00:00.000Z";
    const h2 = computeRowHash({
      prevHash: h1,
      transactionId: 2,
      amount: 9488,
      transactionType: "CREDIT",
      createdAt: t2Date,
    });

    // An unauthorized DB direct update alters row 1's amount from 7590 to 8000
    const tamperedChain = [
      { id: 1, prev_hash: GENESIS_HASH, row_hash: h1, amount: 8000, transaction_type: "CREDIT", created_at: t1Date },
      { id: 2, prev_hash: h1, row_hash: h2, amount: 9488, transaction_type: "CREDIT", created_at: t2Date },
    ];

    const check = verifyChain(tamperedChain);
    expect(check.valid).toBe(false);
    expect(check.brokenAtId).toBe(1);
  });

  it("should enforce Maker-Checker: expenses <= threshold auto-approve to ledger, expenses > threshold remain PENDING_APPROVAL", async () => {
    vi.spyOn(configModel, "get").mockResolvedValue("15000");
    vi.spyOn(expenseModel, "insertExpense").mockImplementation(async (exp) => 101);
    vi.spyOn(ledgerModel, "getLastRow").mockResolvedValue(null);
    vi.spyOn(ledgerModel, "appendTransaction").mockResolvedValue({
      insertId: 55,
      ledgerId: 55,
      balanceAfter: 3800,
      prevHash: GENESIS_HASH,
      rowHash: "mockedRowHash",
    });
    vi.spyOn(ledgerModel, "insertTransaction").mockResolvedValue(55);

    // 1. Low value expense (e.g. ₹3,800) -> Auto-approved directly into ledger
    const lowExpense = await ledgerService.logExpense({
      vendorName: "Aquaguard",
      expenseCategory: "RO Service",
      description: "Filter replacement",
      amount: 3800,
      incurredAt: "2026-02-05",
      createdBy: 2, // Treasurer
    });

    expect(lowExpense.requiresApproval).toBe(false);
    expect(lowExpense.status).toBe("APPROVED");
    expect(lowExpense.ledgerId).toBe(55);

    // 2. High value expense (e.g. ₹65,000 > ₹15,000 threshold) -> PENDING_APPROVAL
    const highExpense = await ledgerService.logExpense({
      vendorName: "Asian Paints",
      expenseCategory: "Waterproofing",
      description: "Terrace advance",
      amount: 65000,
      incurredAt: "2026-02-10",
      createdBy: 2,
    });

    expect(highExpense.requiresApproval).toBe(true);
    expect(highExpense.status).toBe("PENDING_APPROVAL");
    expect(highExpense.ledgerId).toBeNull();
  });
});
