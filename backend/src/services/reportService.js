import pool from "../config/db.js";
import * as societyModel from "../models/societyModel.js";
import * as configModel from "../models/configModel.js";
import * as ledgerModel from "../models/ledgerModel.js";
import * as pollModel from "../models/pollModel.js";
import { verifyChain, GENESIS_HASH } from "../utils/ledgerHash.js";
import { getTreasurySummary } from "./ledgerService.js";

/**
 * Generate comprehensive Statutory AGM Financial & Governance Audit Pack
 * for Indian Housing Society Annual General Meetings (AGM).
 */
export async function getAgmFinancialPack(societyId = 1) {
  const socId = Number(societyId) || 1;

  // 1. Society Profile & System Settings
  const society = (await societyModel.findById(socId)) || {
    id: socId,
    name: "Vastu Heights Co-operative Housing Society Ltd.",
    registration_number: "MAH/PUN/RWA/2026/411045",
    address: "Baner, Pune, Maharashtra 411045",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411045",
    contact_email: "treasury@vastuheights.in",
    contact_phone: "+91 98765 43210",
  };

  const settings = await configModel.getAll(socId);

  // 2. Financial Year Period Calculation (Indian Fiscal Year: 1st April to 31st March)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed: 3 = April
  const fyString =
    currentMonth >= 3
      ? `FY ${currentYear}–${String(currentYear + 1).slice(2)}`
      : `FY ${currentYear - 1}–${String(currentYear).slice(2)}`;

  // 3. Treasury Summary & Liquid Balance
  const treasurySummary = await getTreasurySummary(socId);
  const currentBalance = await ledgerModel.getBalance(socId);

  // 4. Inflows / Collections Breakdown (from PAID maintenance bills)
  const [collectionRows] = await pool.execute(
    `SELECT 
       COALESCE(SUM(base_amount), 0)   AS base_amount,
       COALESCE(SUM(sinking_fund), 0)  AS sinking_fund,
       COALESCE(SUM(repair_fund), 0)   AS repair_fund,
       COALESCE(SUM(non_occupancy), 0) AS non_occupancy,
       COALESCE(SUM(late_fee), 0)      AS late_fee,
       COALESCE(SUM(total_amount), 0)  AS total_collected,
       COUNT(*)                        AS bills_paid_count
     FROM maintenance_bills
     WHERE society_id = ? AND status = 'PAID'`,
    [socId]
  );
  const collections = collectionRows[0] || {
    base_amount: 0,
    sinking_fund: 0,
    repair_fund: 0,
    non_occupancy: 0,
    late_fee: 0,
    total_collected: 0,
    bills_paid_count: 0,
  };

  // Convert numbers
  const formattedCollections = {
    baseAmount: Number(collections.base_amount),
    sinkingFund: Number(collections.sinking_fund),
    repairFund: Number(collections.repair_fund),
    nonOccupancy: Number(collections.non_occupancy),
    lateFee: Number(collections.late_fee),
    totalCollected: Number(collections.total_collected),
    billsPaidCount: Number(collections.bills_paid_count),
  };

  // 5. Disbursements / Expenditure Breakdown by Category (from APPROVED vendor expenses)
  const [expenseRows] = await pool.execute(
    `SELECT 
       expense_category,
       COUNT(*)                       AS expense_count,
       COALESCE(SUM(amount), 0)       AS total_amount,
       COALESCE(SUM(gst_amount), 0)   AS total_gst
     FROM vendor_expenses
     WHERE society_id = ? AND status = 'APPROVED'
     GROUP BY expense_category
     ORDER BY total_amount DESC`,
    [socId]
  );

  let totalExpensesAmount = 0;
  let totalGstDisbursed = 0;
  const itemizedExpenses = expenseRows.map((row) => {
    const amt = Number(row.total_amount);
    const gst = Number(row.total_gst);
    totalExpensesAmount += amt;
    totalGstDisbursed += gst;
    return {
      category: row.expense_category,
      count: Number(row.expense_count),
      amount: amt,
      gstAmount: gst,
    };
  });

  const netSurplusOrDeficit =
    Math.round((formattedCollections.totalCollected - totalExpensesAmount) * 100) / 100;

  // 6. Earmarked Reserve Funds (Statutory MCS Act requirement)
  const reserveFunds = {
    sinkingFundReserve: formattedCollections.sinkingFund,
    repairFundReserve: formattedCollections.repairFund,
    generalOperatingFund: Math.max(0, currentBalance - (formattedCollections.sinkingFund + formattedCollections.repairFund)),
  };

  // 7. Schedule of Defaulters & Overdue Arrears (Statutory General Body Disclosure)
  const [defaulterRows] = await pool.execute(
    `SELECT 
       mb.id,
       mb.flat_id,
       f.wing,
       f.number AS flat_number,
       f.bhk,
       f.area_sqft,
       COALESCE(u.full_name, 'Vacant / Unassigned') AS resident_name,
       mb.billing_cycle,
       mb.due_date,
       mb.base_amount,
       mb.late_fee,
       mb.total_amount,
       mb.status,
       DATEDIFF(CURRENT_DATE, mb.due_date) AS days_overdue
     FROM maintenance_bills mb
     JOIN flats f ON mb.flat_id = f.id
     LEFT JOIN users u ON u.flat_id = f.id
     WHERE mb.society_id = ? AND mb.status IN ('OVERDUE', 'PENDING')
     ORDER BY mb.due_date ASC, f.wing, f.number`,
    [socId]
  );

  let totalDefaulterArrears = 0;
  const defaultersList = defaulterRows.map((d) => {
    const total = Number(d.total_amount);
    totalDefaulterArrears += total;
    return {
      billId: d.id,
      flatId: d.flat_id,
      wing: d.wing,
      flatNumber: d.flat_number,
      unitDisplay: `${d.wing}-${d.flat_number}`,
      bhk: d.bhk,
      areaSqft: d.area_sqft,
      residentName: d.resident_name,
      billingCycle: d.billing_cycle,
      dueDate: d.due_date,
      baseAmount: Number(d.base_amount),
      lateFee: Number(d.late_fee),
      totalAmount: total,
      status: d.status,
      daysOverdue: Math.max(0, Number(d.days_overdue) || 0),
    };
  });

  // 8. Schedule of AGM Resolutions & Democratic Voting Tallies
  const allPolls = await pollModel.listPolls(socId);
  const resolutionsSchedule = allPolls.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    startDate: p.startDate || p.start_date,
    endDate: p.endDate || p.end_date,
    status: p.outcome && p.outcome !== "IN_PROGRESS" ? p.outcome : p.status, // PASSED, REJECTED, INCONCLUSIVE_NO_QUORUM, ACTIVE
    totalFlats: p.totalFlats,
    totalVotes: p.totalVotes,
    turnoutPct: p.turnoutPct,
    quorumPct: p.quorumPct || 60,
    quorumRequired: p.quorumRequired,
    quorumMet: p.quorumMet,
    quorum: {
      totalFlats: p.totalFlats,
      totalVotes: p.totalVotes,
      turnoutPct: p.turnoutPct,
      quorumPct: p.quorumPct || 60,
      quorumRequired: p.quorumRequired,
      quorumMet: p.quorumMet,
    },
    tally: p.tally,
    percentages: p.percentages,
  }));

  // 9. Cryptographic SHA-256 Ledger Integrity Certificate
  const ledgerRows = await ledgerModel.getAll(socId);
  const chainVerification = verifyChain(ledgerRows);
  const latestHash =
    ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].row_hash : GENESIS_HASH;

  const cryptographicProof = {
    valid: chainVerification.valid,
    status: chainVerification.valid ? "VERIFIED_UNTAMPERED" : "TAMPER_DETECTED",
    brokenAtId: chainVerification.brokenAtId || null,
    reason: chainVerification.reason || null,
    genesisHash: GENESIS_HASH,
    latestBlockHash: latestHash,
    totalAuditedBlocks: ledgerRows.length,
    algorithm: "SHA-256 (Deterministic Multi-Field Hash)",
    verifiedAt: now.toISOString(),
  };

  // 10. Statutory Declaration & Committee Signatories
  return {
    society: {
      id: society.id,
      name: society.name,
      registrationNumber: society.registration_number,
      address: society.address,
      city: society.city,
      state: society.state,
      pincode: society.pincode,
      contactEmail: society.contact_email,
      contactPhone: society.contact_phone,
      gstin: settings.SOCIETY_GSTIN || "27AABCV1234F1ZK",
      bankMask: settings.SOCIETY_BANK_MASK || "ICICI Bank ****4521",
      upiVpa: settings.SOCIETY_UPI_VPA || "vastuheights@icici",
    },
    meta: {
      financialYear: fyString,
      generatedAt: now.toISOString(),
      reportTitle: "Statutory AGM Financial & Governance Audit Pack",
      actReference: "Section 79/81, Maharashtra Co-operative Societies Act, 1960 / Model Bye-Laws",
    },
    treasury: {
      currentBalance,
      summary: treasurySummary,
    },
    incomeExpenditure: {
      collections: formattedCollections,
      expenses: {
        itemized: itemizedExpenses,
        totalExpenses: Math.round(totalExpensesAmount * 100) / 100,
        totalGstDisbursed: Math.round(totalGstDisbursed * 100) / 100,
      },
      netSurplusOrDeficit,
    },
    reserveFunds,
    defaulters: {
      totalDefaulterArrears: Math.round(totalDefaulterArrears * 100) / 100,
      defaulterCount: defaultersList.length,
      schedule: defaultersList,
    },
    resolutions: resolutionsSchedule,
    cryptographicProof,
    signatories: [
      { designation: "Chairman / President", name: "Managing Committee", role: "Executive Signatory" },
      { designation: "Honorary Secretary", name: "Managing Committee", role: "Administrative Signatory" },
      { designation: "Honorary Treasurer", name: "Managing Committee", role: "Financial Custodian" },
      { designation: "Statutory Auditor", name: "Appointed Chartered Accountant", role: "Independent Verification" },
    ],
  };
}
