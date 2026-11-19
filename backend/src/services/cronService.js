import cron from "node-cron";
import * as billingService from "./billingService.js";
import * as configModel from "../models/configModel.js";
import pool from "../config/db.js";

let billingTask = null;
let lateFeeTask = null;

/**
 * Trigger monthly billing generation across all ACTIVE housing societies.
 * Evaluates each society's configured BILLING_CYCLE_DAY and generates
 * bills using that society's custom formula.
 */
export async function triggerDailyBillingCron(targetDate = new Date()) {
  try {
    const dayOfMonth = targetDate.getDate();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const billingCycle = `${year}-${month}-01`;

    const [societies] = await pool.execute(
      "SELECT id, name FROM societies WHERE status = 'ACTIVE'"
    );

    console.log(`[Cron] Running billing check for ${societies.length} active societies (Cycle: ${billingCycle}, Day: ${dayOfMonth})...`);

    let totalBillsGenerated = 0;

    for (const soc of societies) {
      try {
        const cycleDayConfig = await configModel.get("BILLING_CYCLE_DAY", soc.id);
        const configuredDay = cycleDayConfig ? Number(cycleDayConfig) : 1;

        // Generate if today matches configured billing day (or 1st of month fallback)
        if (dayOfMonth === configuredDay || dayOfMonth === 1) {
          const bills = await billingService.generateMonthlyBills(soc.id, billingCycle);
          totalBillsGenerated += bills.length;
          console.log(`[Cron] Society #${soc.id} (${soc.name}): Generated ${bills.length} bills.`);
        }
      } catch (socErr) {
        console.error(`[Cron] Failed generating bills for Society #${soc.id} (${soc.name}):`, socErr.message);
      }
    }

    return { totalBillsGenerated, societiesChecked: societies.length };
  } catch (err) {
    console.error("[Cron] Error in multi-tenant billing cron job:", err.message);
    throw err;
  }
}

/**
 * Trigger daily overdue check & late-fee computation across all societies.
 * Marks PENDING bills whose due_date < CURDATE() as OVERDUE,
 * and updates late_fee according to that society's penalty rules.
 */
export async function triggerLateFeeCron() {
  try {
    console.log("[Cron] Running daily late-fee & overdue inspection...");

    // Find all PENDING bills past their due_date
    const [overdueRows] = await pool.execute(
      `SELECT id, society_id, due_date, total_amount, base_amount, sinking_fund, repair_fund, non_occupancy
       FROM maintenance_bills
       WHERE status = 'PENDING' AND due_date < CURDATE()`
    );

    let updatedCount = 0;

    for (const row of overdueRows) {
      try {
        const lateFee = await billingService.calculateLateFee(row.id);
        await pool.execute(
          `UPDATE maintenance_bills
           SET status = 'OVERDUE',
               late_fee = ?,
               total_amount = base_amount + sinking_fund + repair_fund + non_occupancy + ?
           WHERE id = ?`,
          [lateFee, lateFee, row.id]
        );
        updatedCount++;
      } catch (billErr) {
        console.error(`[Cron] Failed updating overdue bill #${row.id}:`, billErr.message);
      }
    }

    console.log(`[Cron] Completed overdue check: ${updatedCount} bills marked OVERDUE with penalty fees.`);
    return { overdueCount: updatedCount };
  } catch (err) {
    console.error("[Cron] Error in late-fee cron job:", err.message);
    throw err;
  }
}

/**
 * Initialize automated cron schedules.
 */
export function initCronJobs() {
  console.log("[Cron] Initializing scheduled financial jobs...");

  // 1. Run daily at 00:05 — Checks each active society's billing cycle day and generates bills
  billingTask = cron.schedule("5 0 * * *", async () => {
    try {
      await triggerDailyBillingCron();
    } catch (err) {
      console.error("[Cron] Daily billing task failed:", err.message);
    }
  });

  // 2. Run daily at 00:30 — Marks overdue bills and computes late-fee interest
  lateFeeTask = cron.schedule("30 0 * * *", async () => {
    try {
      await triggerLateFeeCron();
    } catch (err) {
      console.error("[Cron] Daily late-fee task failed:", err.message);
    }
  });

  console.log("[Cron] Financial cron jobs scheduled ✓");
}

export function stopCronJobs() {
  if (billingTask) billingTask.stop();
  if (lateFeeTask) lateFeeTask.stop();
}
