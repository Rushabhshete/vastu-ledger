import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  QrCode,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import GlassCard from "../../components/ui/GlassCard.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import UpiPaymentModal from "../../components/ui/UpiPaymentModal.jsx";
import { formatINR, formatDate } from "../../utils/formatCurrency.js";
import { generateMaintenanceReceiptPDF } from "../../utils/pdfExporter.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as billingService from "../../services/billingService.js";

export function MaintenanceBillsPage() {
  const { user, hasRole } = useAuth();
  const { currentSocietyId, currentSociety, societyName, upiVpa, gstin } = useSocietyConfig();

  const [activeTab, setActiveTab] = useState(user?.role === "RESIDENT" ? "my" : "all");
  const [bills, setBills] = useState([]);
  const [myBills, setMyBills] = useState([]);
  const [pendingUpi, setPendingUpi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedBillForPay, setSelectedBillForPay] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [billingCycleInput, setBillingCycleInput] = useState("2026-04-01");
  const [generating, setGenerating] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const canManage = hasRole("ADMIN", "TREASURER", "COMMITTEE") || Boolean(user?.isSuperadmin);
      if (canManage) {
        const [allB, pending] = await Promise.all([
          billingService.listBills(),
          billingService.listPendingReconciliations(),
        ]);
        setBills(Array.isArray(allB) ? allB : []);
        setPendingUpi(Array.isArray(pending) ? pending : []);
      }

      if (user?.flatId) {
        const my = await billingService.getMyBills();
        setMyBills(Array.isArray(my) ? my : []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, currentSocietyId]);

  const handleGenerateBills = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await billingService.generateBills(billingCycleInput);
      setActionMessage(`Generated ${res.length} bills for cycle ${billingCycleInput}`);
      setGenerateModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to generate bills");
    } finally {
      setGenerating(false);
    }
  };

  const handleVerifyUtr = async (reconciliationId) => {
    try {
      await billingService.verifyUtr(reconciliationId);
      setActionMessage("Payment verified and recorded to ledger ✓");
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Verification failed");
    }
  };

  const displayedBills = (activeTab === "my" ? myBills : bills).filter((b) => {
    const flatNo = `${b.wing || ""}-${b.flat_number || b.flat_id}`.toLowerCase();
    const matchesSearch = flatNo.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const myTotalPending = myBills
    .filter((b) => b.status !== "PAID")
    .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const myFlatInfo = myBills[0]
    ? `${myBills[0].wing || "A"}-${myBills[0].flat_number || ""}`
    : user?.flatId
    ? `Unit #${user.flatId}`
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
            Maintenance & Billing Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated dynamic slab billing, instant UPI QR payments, and UTR reconciliation.
          </p>
        </div>

        {hasRole("ADMIN", "TREASURER") && (
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-[#F59E0B]/20"
          >
            <Plus className="w-4 h-4" />
            Generate Monthly Bills
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage("")} className="text-slate-800 dark:text-white hover:underline text-[11px] font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Resident Flat Portal Hero Card */}
      {user?.flatId && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-amber-500/10 to-transparent border border-teal-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#14B8A6] uppercase tracking-wider">
              Flat Owner Self-Service • {societyName}
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {user?.fullName} {myFlatInfo ? `(Flat ${myFlatInfo})` : ""}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct UPI Payee: <strong className="text-slate-700 dark:text-slate-200 font-mono">{upiVpa}</strong> • Instant Verification & GST Receipts
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Outstanding Dues</span>
              <span className={`text-xl font-bold font-mono tabular-numbers ${myTotalPending > 0 ? "text-[#E11D48]" : "text-[#14B8A6]"}`}>
                {formatINR(myTotalPending)}
              </span>
            </div>

            {myTotalPending > 0 && myBills.find((b) => b.status !== "PAID") && (
              <button
                onClick={() => {
                  const pendingBill = myBills.find((b) => b.status !== "PAID");
                  setSelectedBillForPay(pendingBill);
                  setPayModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                Pay Dues via UPI
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
        {hasRole("ADMIN", "TREASURER", "COMMITTEE") && (
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "all"
                ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Society Bills ({bills.length})
          </button>
        )}

        {user?.flatId && (
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "my"
                ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            My Flat Bills ({myBills.length})
          </button>
        )}

        {hasRole("ADMIN", "TREASURER") && (
          <button
            onClick={() => setActiveTab("reconcile")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === "reconcile"
                ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>UPI Reconciliation Queue</span>
            {pendingUpi.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-[#0B0F17] text-[10px] font-mono font-bold">
                {pendingUpi.length}
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === "reconcile" ? (
        /* Reconciliation Queue */
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pending UPI UTR Verifications</h3>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">{pendingUpi.length} Waiting</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Req ID</th>
                  <th className="py-2.5 px-3">Bill ID</th>
                  <th className="py-2.5 px-3">Flat</th>
                  <th className="py-2.5 px-3">12-Digit UPI UTR</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Submitted At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {pendingUpi.length > 0 ? (
                  pendingUpi.map((r) => (
                    <tr key={r.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">#{r.id}</td>
                      <td className="py-3 px-3 font-mono text-[#F59E0B] font-medium">Bill #{r.bill_id}</td>
                      <td className="py-3 px-3 text-slate-900 dark:text-white font-semibold">Flat {r.wing}-{r.flat_number}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white bg-black/5 dark:bg-white/5 px-2 rounded">
                        {r.utr}
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-semibold text-[#14B8A6]">
                        {formatINR(r.amount)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{formatDate(r.created_at)}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleVerifyUtr(r.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-medium transition shadow-sm"
                        >
                          Verify & Reconcile
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      Reconciliation queue clear. No pending UPI submissions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        /* Bills List Table */
        <GlassCard className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flat (e.g. A-101)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Bill ID</th>
                  <th className="py-2.5 px-3">Flat</th>
                  <th className="py-2.5 px-3">Billing Cycle</th>
                  <th className="py-2.5 px-3 text-right">Base</th>
                  <th className="py-2.5 px-3 text-right">Sinking</th>
                  <th className="py-2.5 px-3 text-right">Late Fee</th>
                  <th className="py-2.5 px-3 text-right">Total Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {displayedBills.length > 0 ? (
                  displayedBills.map((b) => (
                    <tr key={b.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">#{b.id}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        Flat {b.wing || "A"}-{b.flat_number || b.flat_id}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{formatDate(b.billing_cycle)}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-numbers text-slate-700 dark:text-slate-300">
                        {formatINR(b.base_amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-numbers text-slate-500 dark:text-slate-400">
                        {formatINR(b.sinking_fund)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-numbers text-[#E11D48] font-medium">
                        {Number(b.late_fee) > 0 ? formatINR(b.late_fee) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-numbers">
                        {formatINR(b.total_amount)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          status={
                            b.status === "PAID"
                              ? "PAID"
                              : b.reconciliation_status === "SUBMITTED"
                              ? "SUBMITTED"
                              : b.status
                          }
                        />
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{formatDate(b.due_date)}</td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {b.status !== "PAID" && (
                          b.reconciliation_status === "SUBMITTED" ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-mono inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> UTR Submitted
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedBillForPay(b);
                                setPayModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs transition inline-flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" /> Pay UPI
                            </button>
                          )
                        )}
                        <button
                          onClick={() =>
                            generateMaintenanceReceiptPDF({
                              bill: b,
                              flat: {
                                wing: b.wing,
                                number: b.flat_number,
                                bhk: b.bhk,
                                area_sqft: b.area_sqft,
                              },
                              resident: { fullName: user?.fullName || "Resident" },
                              society: {
                                NAME: societyName,
                                REG_NO: currentSociety?.registration_number,
                                GSTIN: gstin,
                                ADDRESS: currentSociety?.address,
                              },
                              utr: b.utr || "Verified Bank Inflow",
                            })
                          }
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition inline-flex cursor-pointer"
                          title="Download Official GST Maintenance Receipt (PDF)"
                        >
                          <Download className="w-4 h-4 text-[#14B8A6]" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No maintenance bills matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Generate Bills Modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-[var(--text-primary)] transition-colors duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Generate Monthly Maintenance Bills</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This triggers the dynamic calculation formula (Slab/Sq.ft/Hybrid + Sinking & Repair Funds + Non-Occupancy) for all society units.
            </p>
            <form onSubmit={handleGenerateBills} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Billing Cycle (1st of month)
                </label>
                <input
                  type="date"
                  value={billingCycleInput}
                  onChange={(e) => setBillingCycleInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] text-[#0B0F17] font-semibold text-xs shadow-md shadow-[#F59E0B]/20"
                >
                  {generating ? "Generating..." : "Generate for All Flats"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {selectedBillForPay && (
        <UpiPaymentModal
          isOpen={payModalOpen}
          onClose={() => {
            setPayModalOpen(false);
            setSelectedBillForPay(null);
          }}
          bill={selectedBillForPay}
          onSuccess={() => {
            loadData();
            setPayModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default MaintenanceBillsPage;