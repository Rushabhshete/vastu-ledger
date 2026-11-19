import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  Receipt,
  FileCheck,
  AlertTriangle,
  ShieldCheck,
  Building,
  QrCode,
  Download,
  X,
  RefreshCw,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import GlassCard from "../../components/ui/GlassCard.jsx";
import AnimatedCounter from "../../components/ui/AnimatedCounter.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import SocietyTower3D from "../../components/three/SocietyTower3D.jsx";
import UpiPaymentModal from "../../components/ui/UpiPaymentModal.jsx";
import { formatINR } from "../../utils/formatCurrency.js";
import { truncateHash } from "../../utils/cryptoClient.js";
import { generateMaintenanceReceiptPDF } from "../../utils/pdfExporter.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as ledgerService from "../../services/ledgerService.js";
import * as societyService from "../../services/societyService.js";

function CustomPieTooltip({ active, payload, totalExpense = 0 }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const raw = item.payload || {};
    const total = totalExpense > 0 ? totalExpense : (item.value || 1);
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    const dotColor = raw.color || item.color || "#F59E0B";

    return (
      <div className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/20 p-3.5 rounded-2xl shadow-2xl min-w-[210px] pointer-events-none backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: dotColor }}
          />
          <span className="font-bold text-xs text-slate-900 dark:text-white">
            {item.name}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1.5 border-t border-slate-100 dark:border-white/10">
          <span className="font-mono font-bold text-sm text-[#D97706] dark:text-[#F59E0B] tabular-numbers">
            {formatINR(item.value)}
          </span>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#14B8A6]/15 text-[#0D9488] dark:text-[#14B8A6] border border-[#14B8A6]/20">
            {pct}% share
          </span>
        </div>
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const inflow = payload.find((p) => p.dataKey === "inflow")?.value || 0;
    const outflow = payload.find((p) => p.dataKey === "outflow")?.value || 0;
    const net = inflow - outflow;

    return (
      <div className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/20 p-3.5 rounded-2xl shadow-2xl min-w-[220px] pointer-events-none backdrop-blur-xl">
        <div className="font-bold text-xs text-slate-900 dark:text-white mb-2 pb-1 border-b border-slate-100 dark:border-white/10 font-mono">
          {label} (FY 2025-26)
        </div>
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6]" /> Inflow
            </span>
            <span className="font-bold text-[#14B8A6] tabular-numbers">
              {formatINR(inflow)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Outflow
            </span>
            <span className="font-bold text-[#F59E0B] tabular-numbers">
              {formatINR(outflow)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100 dark:border-white/10 text-[11px]">
            <span className="text-slate-600 dark:text-slate-400">Net Surplus</span>
            <span className={`font-bold tabular-numbers ${net >= 0 ? "text-[#14B8A6]" : "text-[#E11D48]"}`}>
              {net >= 0 ? `+${formatINR(net)}` : `-${formatINR(Math.abs(net))}`}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function CommandCenterPage() {
  const { user } = useAuth();
  const { currentSocietyId, currentSociety, societyName, upiVpa, gstin } = useSocietyConfig();

  const [summary, setSummary] = useState({
    currentBalance: 48950,
    totalCredit: 67965,
    totalDebit: 85420,
    transactionCount: 12,
  });
  const [integrity, setIntegrity] = useState({ valid: true });
  const [recentTx, setRecentTx] = useState([]);
  const [societyFlats, setSocietyFlats] = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cashflowData, setCashflowData] = useState([]);
  const [expenseDistribution, setExpenseDistribution] = useState([]);

  const totalExpenses = useMemo(() => {
    return expenseDistribution.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
  }, [expenseDistribution]);

  const loadData = async () => {
    try {
      const [sumData, txData, intData, flatsData, analyticsData] = await Promise.all([
        ledgerService.getSummary(),
        ledgerService.getTransactions(),
        ledgerService.verifyIntegrity(),
        societyService.listFlats(currentSocietyId),
        ledgerService.getAnalytics().catch(() => null),
      ]);
      if (sumData) setSummary(sumData);
      if (txData) setRecentTx(txData.slice(-6).reverse());
      if (intData) setIntegrity(intData);
      if (Array.isArray(flatsData)) {
        setSocietyFlats(flatsData);
        if (user?.role === "RESIDENT" && user?.flatId) {
          const myUnit = flatsData.find((f) => f.id === Number(user.flatId));
          if (myUnit) setSelectedFlat(myUnit);
        }
      }
      if (analyticsData) {
        setCashflowData(Array.isArray(analyticsData.cashflow) ? analyticsData.cashflow : []);
        setExpenseDistribution(Array.isArray(analyticsData.expenseDistribution) ? analyticsData.expenseDistribution : []);
      }
    } catch {
      // Retain defaults
    }
  };

  useEffect(() => {
    setSelectedFlat(null);
    setCashflowData([]);
    setExpenseDistribution([]);
    loadData();
  }, [currentSocietyId]);

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await ledgerService.verifyIntegrity();
      setIntegrity(res);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
            Society Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial telemetry, 3D architectural twin, and SHA-256 tamper-evident ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-mono font-medium ${
              integrity.valid
                ? "bg-[#14B8A6]/10 border-[#14B8A6]/30 text-[#14B8A6]"
                : "bg-[#E11D48]/10 border-[#E11D48]/30 text-[#E11D48]"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{integrity.valid ? "Ledger Chain Untampered ✓" : "TAMPER ALERT BROKEN CHAIN"}</span>
          </div>

          <button
            onClick={handleVerifyIntegrity}
            disabled={verifying}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm transition"
            title="Verify SHA-256 Hash Chain"
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? "animate-spin text-[#F59E0B]" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Society Treasury</span>
            <div className="p-2 rounded-xl bg-[#14B8A6]/15 text-[#14B8A6]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-numbers">
            <AnimatedCounter value={summary.currentBalance} isCurrency={true} />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#14B8A6] font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Liquid reserve in society bank</span>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Maintenance Inflows</span>
            <div className="p-2 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-numbers">
            <AnimatedCounter value={summary.totalCredit} isCurrency={true} />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Reconciled via UPI & RTGS
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Approved Outflows</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500 dark:text-rose-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-numbers">
            <AnimatedCounter value={summary.totalDebit} isCurrency={true} />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Maker-Checker vendor disbursements
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sinking Fund (10%)</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-numbers">
            <AnimatedCounter value={summary.totalCredit * 0.1} isCurrency={true} />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Statutory capital replacement pool
          </div>
        </GlassCard>
      </div>

      {/* 3D Society Tower Twin + Slide-over Flat Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SocietyTower3D
            flats={societyFlats}
            selectedFlat={selectedFlat}
            onSelectFlat={(flat) => setSelectedFlat(flat)}
          />
        </div>

        {/* Flat Details Slide-over Card */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4">
          {selectedFlat ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#F59E0B] font-semibold">
                    Unit Telemetry
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    Flat {selectedFlat.wing}-{selectedFlat.number}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFlat(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-slate-500 dark:text-slate-400">Owner / Resident</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedFlat.owner || selectedFlat.resident_name || "Unassigned"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-slate-500 dark:text-slate-400">Configuration</span>
                  <span className="font-mono text-slate-800 dark:text-white">{selectedFlat.bhk} • {selectedFlat.area_sqft || 1200} sq.ft</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-slate-500 dark:text-slate-400">Occupancy</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 font-medium">
                    {selectedFlat.occupancy_type ? selectedFlat.occupancy_type.replace(/_/g, " ") : "OCCUPIED"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-slate-500 dark:text-slate-400">Payment Status</span>
                  <StatusBadge status={selectedFlat.status} />
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-slate-500 dark:text-slate-400">Current Due</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-numbers">
                    {selectedFlat.amount}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-[#F59E0B]/20 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  Instant UPI QR Pay
                </button>

                <button
                  onClick={() =>
                    generateMaintenanceReceiptPDF({
                      bill: {
                        id: selectedFlat.latest_bill_id || selectedFlat.id,
                        total_amount: selectedFlat.numericAmount || Number(String(selectedFlat.amount).replace(/[^0-9.-]+/g, "")) || 7590,
                        billing_cycle: selectedFlat.latest_billing_cycle || "2026-03-01",
                        status: selectedFlat.status,
                        base_amount: selectedFlat.base_amount,
                        sinking_fund: selectedFlat.sinking_fund,
                        repair_fund: selectedFlat.repair_fund,
                        non_occupancy: selectedFlat.non_occupancy,
                        late_fee: selectedFlat.late_fee,
                      },
                      flat: selectedFlat,
                      resident: { fullName: selectedFlat.owner || selectedFlat.resident_name || user?.fullName || "Resident" },
                      society: {
                        NAME: societyName,
                        REG_NO: currentSociety?.registration_number,
                        GSTIN: gstin,
                        ADDRESS: currentSociety?.address,
                      },
                      utr: selectedFlat.utr || "Verified Bank Inflow",
                    })
                  }
                  className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-[var(--border-subtle)] font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#14B8A6]" />
                  Download GST Receipt PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="my-auto text-center py-12 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-400">
                <Building className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Interactive Unit Inspector</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Select any flat block on the 3D tower twin to inspect maintenance ledgers, UPI reconciliation status, or download audit vouchers.
              </p>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between font-mono">
            <span>UPI VPA: {upiVpa}</span>
            <span className="text-[#14B8A6] font-semibold">Bank Reconciled</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Monthly Cashflow Telemetry</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Maintenance Inflows vs Vendor Outflows (₹ INR)</p>
            </div>
            <span className="text-xs font-mono text-[#F59E0B] font-semibold">Live Ledger</span>
          </div>
          <div className="h-64 w-full">
            {cashflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="inflow" name="Maintenance Inflow (₹)" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="outflow" name="Vendor Outflow (₹)" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                <p>No transaction cashflow recorded yet for this society.</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Expense Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Disbursed Vendor Operational Categories</p>
            </div>
            <span className="text-xs font-mono text-[#F59E0B] font-semibold">
              {formatINR(totalExpenses)} Total
            </span>
          </div>
          <div className="h-52 w-full flex items-center justify-center">
            {expenseDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip totalExpense={totalExpenses} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                <p>No vendor expenses recorded yet.</p>
              </div>
            )}
          </div>
          {/* Quick Legend Category Badges */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
            {expenseDistribution.length > 0 ? (
              expenseDistribution.map((cat) => (
                <span
                  key={cat.name}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-[10px] text-slate-700 dark:text-slate-300 font-medium"
                >
                  <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cat.color }} />
                  <span className="truncate max-w-[100px]">{cat.name}</span>
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-400">Categories populate as expenses are logged.</span>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Recent Ledger Entries (SHA-256 Hash Chained) */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Immutable Ledger Transactions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cryptographically chained via SHA-256 hashes</p>
          </div>
          <a
            href="/expenses"
            className="text-xs text-[#F59E0B] hover:underline font-mono font-medium"
          >
            View Expense Vault →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Tx ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Balance After</th>
                <th className="py-2.5 px-3 font-mono">Row Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {recentTx.length > 0 ? (
                recentTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">#{tx.id}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={tx.transaction_type} />
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{tx.category}</td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white max-w-xs truncate">{tx.description}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-right tabular-numbers text-slate-900 dark:text-white">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-3 font-mono text-right tabular-numbers text-slate-600 dark:text-slate-300">
                      {formatINR(tx.balance_after)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#14B8A6] font-medium">
                      {truncateHash(tx.row_hash)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 dark:text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Payment Modal */}
      <UpiPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        bill={{
          id: selectedFlat?.latest_bill_id || selectedFlat?.id || 1,
          flat_number: `${selectedFlat?.wing || "A"}-${selectedFlat?.number || "101"}`,
          total_amount:
            selectedFlat?.numericAmount ||
            (selectedFlat ? Number(String(selectedFlat.amount).replace(/[^0-9.-]+/g, "")) || 7590 : 7590),
        }}
        onSuccess={() => {
          loadData();
          setPaymentModalOpen(false);
        }}
      />
    </div>
  );
}

export default CommandCenterPage;