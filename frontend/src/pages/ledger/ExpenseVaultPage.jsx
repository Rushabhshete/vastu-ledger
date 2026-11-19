import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Plus,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  UploadCloud,
  Paperclip,
  FileDown,
} from "lucide-react";
import GlassCard from "../../components/ui/GlassCard.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { formatINR, formatDate } from "../../utils/formatCurrency.js";
import { generateLedgerAuditReportPDF, generateAgmFinancialPackPDF } from "../../utils/pdfExporter.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as ledgerService from "../../services/ledgerService.js";

const EXPENSE_CATEGORIES = [
  "AMC",
  "Electricity",
  "Payroll",
  "Waterproofing",
  "Security",
  "Plumbing",
  "RO Service",
  "Clubhouse",
  "Audit & Legal",
  "General Maintenance",
];

export function ExpenseVaultPage() {
  const { user, hasRole } = useAuth();
  const { societyName, makerCheckerThreshold, currentSocietyId } = useSocietyConfig();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionMsg, setActionMsg] = useState("");

  // Log Expense Modal
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFileName, setReceiptFileName] = useState("");
  const [form, setForm] = useState({
    vendorName: "",
    expenseCategory: "AMC",
    description: "",
    amount: "",
    gstAmount: "",
    incurredAt: new Date().toISOString().slice(0, 10),
    receiptPath: "",
  });

  // Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await ledgerService.listExpenses();
      if (Array.isArray(data)) {
        setExpenses(data);
      } else {
        setExpenses([]);
      }
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setExpenses([]);
    loadExpenses();
  }, [currentSocietyId]);

  const handleReceiptFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please upload a smaller PDF or image.");
      return;
    }

    setUploadingReceipt(true);
    try {
      const res = await ledgerService.uploadReceipt(file);
      if (res?.receiptPath) {
        setForm((prev) => ({ ...prev, receiptPath: res.receiptPath }));
        setReceiptFileName(file.name);
      }
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to upload invoice file");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleLogExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await ledgerService.createExpense({
        ...form,
        amount: Number(form.amount),
        gstAmount: Number(form.gstAmount || 0),
      });

      const msg = res.requiresApproval
        ? `Expense logged — requires Committee co-approval (exceeds ₹${res.threshold})`
        : `Expense auto-approved and recorded to ledger`;

      setActionMsg(msg);
      setLogModalOpen(false);
      setReceiptFileName("");
      setForm({
        vendorName: "",
        expenseCategory: "AMC",
        description: "",
        amount: "",
        gstAmount: "",
        incurredAt: new Date().toISOString().slice(0, 10),
        receiptPath: "",
      });
      loadExpenses();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to log expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await ledgerService.approveExpense(id);
      setActionMsg("Expense co-signed and written into SHA-256 ledger ✓");
      loadExpenses();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Approval failed");
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason) return;
    try {
      await ledgerService.rejectExpense(rejectTargetId, rejectionReason);
      setActionMsg("Expense rejected");
      setRejectModalOpen(false);
      setRejectTargetId(null);
      setRejectionReason("");
      loadExpenses();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Rejection failed");
    }
  };

  const [exportingAgm, setExportingAgm] = useState(false);

  const handleExportAgmPDF = async () => {
    setExportingAgm(true);
    try {
      const agmPackage = await ledgerService.getAgmPackage();
      generateAgmFinancialPackPDF({ agmPackage });
    } catch (err) {
      alert("Failed to export Statutory AGM pack: " + (err.response?.data?.message || err.message));
    } finally {
      setExportingAgm(false);
    }
  };

  const handleExportAuditPDF = async () => {
    try {
      const [tx, summary, integrity] = await Promise.all([
        ledgerService.getTransactions(),
        ledgerService.getSummary(),
        ledgerService.verifyIntegrity(),
      ]);
      generateLedgerAuditReportPDF({
        transactions: tx || [],
        summary: summary || {},
        society: { NAME: societyName },
        integrity: integrity || { valid: true },
      });
    } catch (err) {
      alert("Failed to export audit report: " + err.message);
    }
  };

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
            Vendor Expense Vault & Proofs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Public transparency portal with Maker-Checker dual signature enforcement for expenses above {formatINR(makerCheckerThreshold)}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportAgmPDF}
            disabled={exportingAgm}
            className="px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-[var(--border-subtle)] font-medium text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            title="Download Official Statutory AGM Financial & Governance Pack (PDF)"
          >
            <FileDown className="w-4 h-4 text-[#F59E0B]" />
            {exportingAgm ? "Exporting..." : "Statutory AGM Pack"}
          </button>

          <button
            onClick={handleExportAuditPDF}
            className="px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-[var(--border-subtle)] font-medium text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#14B8A6]" />
            Export CA Audit PDF
          </button>

          {hasRole("ADMIN", "TREASURER") && (
            <button
              onClick={() => setLogModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-[#F59E0B]/20"
            >
              <Plus className="w-4 h-4" />
              Log Vendor Bill
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] text-xs flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg("")} className="text-slate-800 dark:text-white hover:underline text-[11px] font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Maker-Checker Rule Banner */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[#F59E0B]/30 flex items-start sm:items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Maker-Checker Co-Signing Active (Threshold: {formatINR(makerCheckerThreshold)})
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Treasurer can enter bills; expenses exceeding {formatINR(makerCheckerThreshold)} require approval from a Managing Committee Member before ledger debit.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded-md border border-[#F59E0B]/20 shrink-0 font-semibold">
          Enforced in DB
        </span>
      </div>

      {/* Expense List Card */}
      <GlassCard className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor or service..."
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
              <option value="ALL">All Expenses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Vendor / Payee</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">GST</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Proof</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.length > 0 ? (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">#{exp.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{exp.vendor_name}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 font-mono text-[10px]">
                        {exp.expense_category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">{exp.description || "—"}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-numbers">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400 tabular-numbers">
                      {Number(exp.gst_amount) > 0 ? formatINR(exp.gst_amount) : "₹0"}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{formatDate(exp.incurred_at)}</td>
                    <td className="py-3 px-3">
                      {exp.receipt_path ? (
                        <a
                          href={exp.receipt_path}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#14B8A6] hover:underline flex items-center gap-1 font-mono text-[11px] font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" /> Receipt
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={exp.status} />
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {exp.status === "PENDING_APPROVAL" && hasRole("ADMIN", "COMMITTEE") && (
                        <>
                          <button
                            onClick={() => handleApprove(exp.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-white text-[11px] font-medium transition shadow-sm"
                          >
                            Co-Sign
                          </button>
                          <button
                            onClick={() => {
                              setRejectTargetId(exp.id);
                              setRejectModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#E11D48]/20 hover:bg-[#E11D48]/30 text-[#E11D48] text-[11px] font-medium transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No vendor expenses found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Log Expense Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-[var(--text-primary)] transition-colors duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Vendor Expense / Invoice</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              All expenses are logged into the public transparency vault. Bills over {formatINR(makerCheckerThreshold)} will require Committee co-approval.
            </p>

            <form onSubmit={handleLogExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vendor / Payee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.vendorName}
                    onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                    placeholder="e.g. Otis Elevator India"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={form.expenseCategory}
                    onChange={(e) => setForm({ ...form, expenseCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">GST Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.gstAmount}
                    onChange={(e) => setForm({ ...form, gstAmount: e.target.value })}
                    placeholder="4500"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Incurred Date</label>
                <input
                  type="date"
                  required
                  value={form.incurredAt}
                  onChange={(e) => setForm({ ...form, incurredAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Vendor Invoice / Receipt Proof
                </label>
                <div className="relative border-2 border-dashed border-[var(--border-subtle)] hover:border-[#F59E0B] rounded-2xl p-3 bg-black/5 dark:bg-white/5 transition flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] shrink-0">
                      {form.receiptPath ? <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" /> : <UploadCloud className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {receiptFileName || (form.receiptPath ? "Invoice Document Attached ✓" : "Upload vendor invoice proof")}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {uploadingReceipt ? "Uploading invoice..." : "PDF, JPG, PNG, WebP (Max 10MB)"}
                      </p>
                    </div>
                  </div>
                  <label className="cursor-pointer shrink-0 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#F59E0B] text-slate-800 dark:text-white text-xs font-medium transition shadow-xs">
                    {uploadingReceipt ? "Uploading..." : form.receiptPath ? "Change File" : "Browse File"}
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      onChange={handleReceiptFileChange}
                      disabled={uploadingReceipt}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Scope of Work</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Lift maintenance service for Jan 2026 under annual contract"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] text-[#0B0F17] font-semibold text-xs shadow-md shadow-[#F59E0B]/20"
                >
                  {submitting ? "Logging..." : "Log & Submit Proof"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-[var(--text-primary)] transition-colors duration-200">
            <h3 className="text-base font-bold text-rose-500">Reject Vendor Expense</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide an official reason for rejection to be archived in the society audit trail.
            </p>
            <form onSubmit={handleReject} className="space-y-4">
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Scope of waterproofing not inspected by society engineer..."
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#E11D48]"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E11D48] text-white font-semibold text-xs shadow-md shadow-[#E11D48]/20"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseVaultPage;