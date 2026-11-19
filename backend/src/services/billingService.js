import * as configModel from "../models/configModel.js";
import * as billingModel from "../models/billingModel.js";
import * as flatModel from "../models/flatModel.js";

/**
 * Calculate a single flat's bill for a given cycle based on dynamic system settings.
 */
export async function calculateBill(flatId, billingCycle, societyId = null) {
  const flat = await flatModel.findById(flatId);
  if (!flat) throw Object.assign(new Error("Flat not found"), { status: 404 });

  const targetSocId = societyId || flat.society_id || 1;
  const config = await configModel.getAll(targetSocId);
  const mode = config.MAINTENANCE_MODE || "FLAT_SQFT";
  const graceDays = Number(config.LATE_FEE_GRACE_DAYS || 10);
  const cycleDay = Number(config.BILLING_CYCLE_DAY || 1);

  let baseAmount;
  if (mode === "FLAT_SQFT") {
    const rate = Number(config.MAINTENANCE_RATE_SQFT || 5.5);
    baseAmount = flat.area_sqft * rate;
  } else if (mode === "FIXED_BHK") {
    baseAmount = Number(config[`FIXED_${flat.bhk}`] || 3500);
  } else {
    // HYBRID = Fixed BHK base + per-sqft addon
    const fixedBase = Number(config[`FIXED_${flat.bhk}`] || 3500);
    const rate      = Number(config.MAINTENANCE_RATE_SQFT || 5.5);
    baseAmount      = fixedBase + (flat.area_sqft * rate * 0.25);
  }

  const sinkingPct = Number(config.SINKING_FUND_PCT || 10) / 100;
  const repairPct = Number(config.REPAIR_FUND_PCT || 5) / 100;
  const nonOccPct = Number(config.NON_OCCUPANCY_CHARGE_PCT || 10) / 100;

  const sinkingFund = Math.round(baseAmount * sinkingPct * 100) / 100;
  const repairFund = Math.round(baseAmount * repairPct * 100) / 100;
  const nonOccupancy = flat.is_occupied ? 0 : Math.round(baseAmount * nonOccPct * 100) / 100;

  const dueDate = new Date(billingCycle);
  dueDate.setDate(cycleDay + graceDays);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  const totalAmount = baseAmount + sinkingFund + repairFund + nonOccupancy;

  return {
    societyId: targetSocId,
    flatId,
    billingCycle,
    baseAmount: Math.round(baseAmount * 100) / 100,
    sinkingFund,
    repairFund,
    nonOccupancy,
    lateFee: 0,
    totalAmount: Math.round(totalAmount * 100) / 100,
    dueDate: dueDateStr,
  };
}

/**
 * Generate bills for flats for a given cycle.
 * Can be called as generateMonthlyBills(billingCycle) or generateMonthlyBills(societyId, billingCycle)
 */
export async function generateMonthlyBills(societyIdOrCycle, maybeCycle) {
  let societyId = null;
  let billingCycle = societyIdOrCycle;

  if (typeof societyIdOrCycle === "number" || typeof maybeCycle === "string") {
    societyId = Number(societyIdOrCycle);
    billingCycle = maybeCycle;
  }

  const flats = await flatModel.listFlats(societyId);
  const results = [];
  for (const flat of flats) {
    const bill = await calculateBill(flat.id, billingCycle, societyId || flat.society_id);
    const id = await billingModel.insertBill(bill);
    results.push({ id, ...bill });
  }
  return results;
}

/**
 * Calculate overdue interest for a bill past its grace period.
 */
export async function calculateLateFee(billId) {
  const bill = await billingModel.findBillById(billId);
  if (!bill || bill.status === "PAID") return 0;

  const societyId = bill.society_id || 1;
  const config = await configModel.getAll(societyId);
  const feeType   = config.LATE_FEE_TYPE || "SIMPLE_PERCENT";
  const feeRate   = Number(config.LATE_FEE_RATE || 18);

  const dueDate   = new Date(bill.due_date);
  const now       = new Date();
  const daysLate  = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));

  if (daysLate <= 0) return 0;

  let lateFee;
  if (feeType === "SIMPLE_PERCENT") {
    // Simple interest: principal * rate% * days / 365
    lateFee = Number(bill.total_amount) * (feeRate / 100) * (daysLate / 365);
  } else {
    // FIXED_DAILY: flat daily rate
    lateFee = feeRate * daysLate;
  }

  return Math.round(lateFee * 100) / 100;
}
