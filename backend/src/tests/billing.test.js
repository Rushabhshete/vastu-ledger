import { describe, it, expect, vi } from "vitest";
import * as billingService from "../services/billingService.js";
import * as configModel from "../models/configModel.js";
import * as flatModel from "../models/flatModel.js";
import * as billingModel from "../models/billingModel.js";

describe("Billing & Late-Fee Penalty Engine", () => {
  it("should calculate FLAT_SQFT bill correctly with sinking and repair fund", async () => {
    // Mock flat 1200 sq.ft, occupied
    vi.spyOn(flatModel, "findById").mockResolvedValue({
      id: 1,
      wing: "A",
      number: "101",
      area_sqft: 1200,
      bhk: "2BHK",
      is_occupied: 1,
    });

    vi.spyOn(configModel, "getAll").mockResolvedValue({
      MAINTENANCE_MODE: "FLAT_SQFT",
      MAINTENANCE_RATE_SQFT: "5.50",
      SINKING_FUND_PCT: "10",
      REPAIR_FUND_PCT: "5",
      NON_OCCUPANCY_CHARGE_PCT: "10",
      LATE_FEE_GRACE_DAYS: "10",
      BILLING_CYCLE_DAY: "1",
    });

    const bill = await billingService.calculateBill(1, "2026-04-01");

    // 1200 * 5.5 = 6600
    expect(bill.baseAmount).toBe(6600);
    // 10% of 6600 = 660
    expect(bill.sinkingFund).toBe(660);
    // 5% of 6600 = 330
    expect(bill.repairFund).toBe(330);
    // Occupied flat -> Non-occupancy = 0
    expect(bill.nonOccupancy).toBe(0);
    // Total = 6600 + 660 + 330 = 7590
    expect(bill.totalAmount).toBe(7590);
    expect(bill.dueDate).toBe("2026-04-11");
  });

  it("should apply 10% Non-Occupancy surcharge when flat is rented/unoccupied", async () => {
    // Mock flat 1500 sq.ft, unoccupied (tenant flat)
    vi.spyOn(flatModel, "findById").mockResolvedValue({
      id: 2,
      wing: "A",
      number: "204",
      area_sqft: 1500,
      bhk: "3BHK",
      is_occupied: 0,
    });

    vi.spyOn(configModel, "getAll").mockResolvedValue({
      MAINTENANCE_MODE: "FLAT_SQFT",
      MAINTENANCE_RATE_SQFT: "5.00",
      SINKING_FUND_PCT: "10",
      REPAIR_FUND_PCT: "5",
      NON_OCCUPANCY_CHARGE_PCT: "10",
      LATE_FEE_GRACE_DAYS: "10",
      BILLING_CYCLE_DAY: "1",
    });

    const bill = await billingService.calculateBill(2, "2026-04-01");

    // 1500 * 5 = 7500
    expect(bill.baseAmount).toBe(7500);
    expect(bill.sinkingFund).toBe(750);
    expect(bill.repairFund).toBe(375);
    // 10% Non-Occupancy = 750
    expect(bill.nonOccupancy).toBe(750);
    // Total = 7500 + 750 + 375 + 750 = 9375
    expect(bill.totalAmount).toBe(9375);
  });

  it("should calculate HYBRID bill mode (Fixed base + per sq.ft variable)", async () => {
    vi.spyOn(flatModel, "findById").mockResolvedValue({
      id: 3,
      wing: "B",
      number: "302",
      area_sqft: 1000,
      bhk: "2BHK",
      is_occupied: 1,
    });

    vi.spyOn(configModel, "getAll").mockResolvedValue({
      MAINTENANCE_MODE: "HYBRID",
      FIXED_2BHK: "3000",
      MAINTENANCE_RATE_SQFT: "4.00",
      SINKING_FUND_PCT: "10",
      REPAIR_FUND_PCT: "5",
      NON_OCCUPANCY_CHARGE_PCT: "10",
      LATE_FEE_GRACE_DAYS: "10",
      BILLING_CYCLE_DAY: "1",
    });

    const bill = await billingService.calculateBill(3, "2026-04-01");

    // Base = 3000 + (1000 * 4 * 0.25) = 4000
    expect(bill.baseAmount).toBe(4000);
    expect(bill.sinkingFund).toBe(400);
    expect(bill.repairFund).toBe(200);
    expect(bill.totalAmount).toBe(4600);
  });

  it("should return zero late fee if within grace period", async () => {
    vi.spyOn(billingModel, "findBillById").mockResolvedValue({
      id: 10,
      total_amount: "5000.00",
      status: "PENDING",
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    vi.spyOn(configModel, "getAll").mockResolvedValue({
      LATE_FEE_TYPE: "SIMPLE_PERCENT",
      LATE_FEE_RATE: "18",
    });

    const lateFee = await billingService.calculateLateFee(10);
    expect(lateFee).toBe(0);
  });

  it("should iterate active societies in multi-tenant cron job and generate bills per society", async () => {
    const { triggerDailyBillingCron } = await import("../services/cronService.js");
    const pool = (await import("../config/db.js")).default;

    vi.spyOn(pool, "execute").mockResolvedValueOnce([
      [
        { id: 1, name: "Vastu Heights" },
        { id: 6, name: "Pride Panorama" },
      ],
    ]);

    vi.spyOn(configModel, "get").mockResolvedValue("1");
    vi.spyOn(billingService, "generateMonthlyBills")
      .mockResolvedValueOnce([{ id: 101 }, { id: 102 }])
      .mockResolvedValueOnce([{ id: 201 }]);

    const result = await triggerDailyBillingCron(new Date("2026-05-01"));
    expect(result.societiesChecked).toBe(2);
    expect(result.totalBillsGenerated).toBe(3);
  });

  it("should list flats with live aggregated bill statuses and unpaid amounts", async () => {
    const pool = (await import("../config/db.js")).default;
    vi.spyOn(pool, "query").mockResolvedValueOnce([
      [
        {
          id: 1,
          society_id: 1,
          wing: "A",
          number: "101",
          area_sqft: 1200,
          bhk: "2BHK",
          occupancy_type: "OWNER_OCCUPIED",
          unpaid_amount: "7590.00",
          bill_status: "PENDING",
          latest_bill_id: "13",
        },
        {
          id: 3,
          society_id: 1,
          wing: "B",
          number: "302",
          area_sqft: 900,
          bhk: "1BHK",
          occupancy_type: "OWNER_OCCUPIED",
          unpaid_amount: "5805.06",
          bill_status: "OVERDUE",
          latest_bill_id: "15",
        },
      ],
    ]);

    const flats = await flatModel.listFlats(1);
    expect(flats).toHaveLength(2);
    expect(flats[0].bill_status).toBe("PENDING");
    expect(flats[0].unpaid_amount).toBe("7590.00");
    expect(flats[1].bill_status).toBe("OVERDUE");
  });
});
