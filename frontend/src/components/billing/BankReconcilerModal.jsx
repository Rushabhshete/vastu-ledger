import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
} from "lucide-react";
import GlassCard from "../ui/GlassCard.jsx";
import { formatINR } from "../../utils/formatCurrency.js";
import * as billingService from "../../services/billingService.js";

export default function BankReconcilerModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const [successResult, setSuccessResult] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      handleParseFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      handleParseFile(dropped);
    }
  };

  const handleParseFile = async (statementFile) => {
    setLoading(true);
    setErrorMsg("");
    setSuccessResult(null);
    try {
      const data = await billingService.previewBankStatement(statementFile);
      setPreviewData(data);

      // Pre-select all matched rows (status MATCHED_UTR or SMART_MATCH)
      const initialSelected = new Set();
      (data.items || []).forEach((item) => {
        if (item.selected) {
          initialSelected.add(item.id);
        }
      });
      setSelectedRowIds(initialSelected);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || "Failed to parse bank statement");
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  const toggleSelectAll = () => {
    if (!previewData?.items) return;
    const eligibleItems = previewData.items.filter(
      (it) => it.status === "MATCHED_UTR" || it.status === "SMART_MATCH"
    );

    if (selectedRowIds.size === eligibleItems.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(eligibleItems.map((it) => it.id)));
    }
  };

  const handleBatchCommit = async () => {
    if (!previewData?.items || selectedRowIds.size === 0) return;

    setCommitting(true);
    setErrorMsg("");
    try {
      const itemsToCommit = previewData.items
        .filter((it) => selectedRowIds.has(it.id))
        .map((it) => ({
          billId: it.billId,
          reconciliationId: it.reconciliationId,
          amount: it.amount,
          extractedUtr: it.extractedUtr,
        }));

      const res = await billingService.batchReconcileBankStatement(itemsToCommit);
      setSuccessResult(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || "Batch reconciliation failed");
    } finally {
      setCommitting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreviewData(null);
    setSelectedRowIds(new Set());
    setErrorMsg("");
    setSuccessResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Selected totals
  const selectedItemsList = (previewData?.items || []).filter((it) => selectedRowIds.has(it.id));
  const selectedTotalAmount = selectedItemsList.reduce((sum, it) => sum + Number(it.amount), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Bank Statement Excel / CSV Auto-Reconciler
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
                  AI Match Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your monthly bank statement (HDFC, SBI, ICICI, Kotak, Axis) to auto-verify resident UPI payments and chain SHA-256 ledger records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Success Banner */}
          {successResult && (
            <div className="p-5 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/30 text-slate-900 dark:text-white flex items-start gap-4 animate-in slide-in-from-top-2">
              <div className="p-2 rounded-xl bg-[#14B8A6] text-white">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-bold text-[#14B8A6]">
                  Batch Reconciliation Completed Successfully!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Auto-verified <strong className="font-mono text-slate-900 dark:text-white">{successResult.reconciledCount} payments</strong> totaling <strong className="font-mono text-slate-900 dark:text-white">{formatINR(successResult.totalAmount)}</strong>.
                  Bills have been updated to <span className="font-mono font-semibold text-[#14B8A6]">PAID</span> and cryptographically chained to the society ledger with SHA-256 tamper-evident integrity.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={resetAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#14B8A6] text-white hover:bg-[#0D9488] transition"
                  >
                    Reconcile Another Statement
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    Close Modal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* File Upload Dropzone (if no preview yet or to switch) */}
          {!previewData && !successResult && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-[#F59E0B] dark:hover:border-[#F59E0B] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 dark:bg-white/[0.02]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-3 border border-[#F59E0B]/20 shadow-inner">
                {loading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {loading ? "Parsing & Matching Bank Statement..." : "Drag & drop your bank statement here"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Supports Excel (.xlsx, .xls) and CSV (.csv) exports from all major Indian banks including SBI, HDFC Bank, ICICI Bank, Kotak Mahindra, and Axis Bank.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10">.CSV</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10">.XLSX</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10">.XLS</span>
              </div>
            </div>
          )}

          {/* Parsed Telemetry Metrics */}
          {previewData && !successResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {previewData.filename}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({previewData.totalCredits} credits parsed)
                  </span>
                </div>
                <button
                  onClick={resetAll}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
                >
                  Upload Different Statement
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/30">
                  <div className="text-[10px] font-mono uppercase text-[#14B8A6] font-bold">
                    Matched & Ready
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {previewData.matchedCount} bills
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {formatINR(previewData.matchedAmount)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-[10px] font-mono uppercase text-amber-500 font-bold">
                    Amount Mismatches
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {previewData.mismatchCount} txns
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Needs manual review
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/30">
                  <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
                    Unmatched Credits
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {previewData.unmatchedCount} txns
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Bank interest/others
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="text-[10px] font-mono uppercase text-blue-500 font-bold">
                    Already Verified
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {previewData.alreadyVerifiedCount} bills
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Previously reconciled
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-[#1A2333] border-b border-slate-200 dark:border-white/10 z-10">
                      <tr className="text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase">
                        <th className="py-2.5 px-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="p-1 hover:text-[#F59E0B] transition"
                            title="Select all matched"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                        </th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Narration / 12-Digit UTR</th>
                        <th className="py-2.5 px-3">Identified Flat</th>
                        <th className="py-2.5 px-3 text-right">Bank Credit</th>
                        <th className="py-2.5 px-3">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {previewData.items.map((it) => {
                        const isSelected = selectedRowIds.has(it.id);
                        const isEligible = it.status === "MATCHED_UTR" || it.status === "SMART_MATCH";

                        return (
                          <tr
                            key={it.id}
                            className={`transition hover:bg-black/5 dark:hover:bg-white/5 ${
                              isSelected ? "bg-[#14B8A6]/5" : ""
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              {isEligible ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSelectRow(it.id)}
                                  className="text-slate-400 hover:text-[#14B8A6] transition"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-[#14B8A6]" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-300 dark:text-white/20">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {it.date}
                            </td>
                            <td className="py-3 px-3 max-w-[280px]">
                              <div className="font-mono text-slate-800 dark:text-slate-200 truncate" title={it.narration}>
                                {it.narration}
                              </div>
                              {it.extractedUtr && (
                                <div className="text-[10px] font-mono text-[#F59E0B] font-bold mt-0.5">
                                  UTR: {it.extractedUtr}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {it.flatNumber ? (
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {it.flatNumber}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {it.residentName} (Bill #{it.billId})
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unidentified</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatINR(it.amount)}
                              {it.expectedAmount && it.expectedAmount !== it.amount && (
                                <div className="text-[10px] text-amber-500">
                                  Bill: {formatINR(it.expectedAmount)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {it.status === "MATCHED_UTR" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
                                  <CheckCircle2 className="w-3 h-3" /> Direct UTR (100%)
                                </span>
                              )}
                              {it.status === "SMART_MATCH" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                  <Sparkles className="w-3 h-3" /> Smart Match (90%)
                                </span>
                              )}
                              {it.status === "AMOUNT_MISMATCH" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  <AlertTriangle className="w-3 h-3" /> Amount Mismatch
                                </span>
                              )}
                              {it.status === "ALREADY_VERIFIED" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                  Already Verified
                                </span>
                              )}
                              {it.status === "UNMATCHED" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-black/5 dark:bg-white/5">
                                  No Match
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {previewData && !successResult && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
            <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Selected: <strong className="text-slate-900 dark:text-white font-bold">{selectedRowIds.size} payments</strong>{" "}
              ({formatINR(selectedTotalAmount)})
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchCommit}
                disabled={committing || selectedRowIds.size === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#14B8A6] text-white hover:bg-[#0D9488] disabled:opacity-50 disabled:pointer-events-none transition flex items-center gap-2 shadow-lg shadow-[#14B8A6]/20"
              >
                {committing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reconciling & Chaining Hashes...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      Approve & Reconcile ({selectedRowIds.size}) to Ledger
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
