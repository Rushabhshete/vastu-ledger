import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, QrCode, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { buildUpiUri } from "../../utils/upiQrGenerator.js";
import { formatINR } from "../../utils/formatCurrency.js";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as billingService from "../../services/billingService.js";

export function UpiPaymentModal({ isOpen, onClose, bill, onSuccess }) {
  const { upiVpa, societyName } = useSocietyConfig();
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen || !bill) return null;

  const totalAmount = Number(bill.total_amount || 0);

  const upiLink = buildUpiUri({
    vpa: upiVpa,
    payeeName: societyName,
    amount: totalAmount,
    billId: bill.id,
    flatNumber: bill.flat_number || `Unit ${bill.flat_id}`,
  });

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(upiVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    setError("");

    const cleanUtr = utr.trim();
    if (!cleanUtr || cleanUtr.length < 10) {
      setError("Please enter a valid 12-digit UPI UTR transaction reference");
      return;
    }

    setSubmitting(true);
    try {
      await billingService.submitUtr({
        billId: bill.id,
        utr: cleanUtr,
        amount: totalAmount,
      });

      setSubmittedSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to submit UTR reference");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)] transition-colors duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Instant UPI Settlement</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bill #{bill.id} • Flat {bill.flat_number || bill.flat_id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {submittedSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/30 flex items-center justify-center text-[#14B8A6]">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">UTR Reference Submitted</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                  UTR <span className="font-mono font-medium text-[#F59E0B]">{utr}</span> for {formatINR(totalAmount)} has been routed to the Treasurer reconciliation queue.
                </p>
                <div className="pt-4">
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl font-medium bg-[#14B8A6] hover:bg-[#0D9488] text-white transition text-sm shadow-md shadow-[#14B8A6]/20"
                  >
                    Done & Return
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* QR Code & Payee Display */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                  <div className="p-3 bg-white rounded-2xl shadow-md shrink-0">
                    <QRCodeSVG
                      value={upiLink}
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-2 text-center sm:text-left">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-[#14B8A6]">
                      Scan via GPay / PhonePe / Paytm / BHIM
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-numbers">
                      {formatINR(totalAmount)}
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                        {upiVpa}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyVpa}
                        className="p-1.5 text-slate-500 hover:text-[#F59E0B] dark:text-slate-400 rounded-md transition"
                        title="Copy VPA"
                      >
                        {copied ? <Check className="w-4 h-4 text-[#14B8A6]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form to submit 12-digit UTR */}
                <form onSubmit={handleSubmitUtr} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm Bank Reference (12-Digit UPI UTR)
                    </label>
                    <input
                      type="text"
                      maxLength={22}
                      value={utr}
                      onChange={(e) => setUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                      placeholder="e.g. 412306789012"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-[#F59E0B] transition"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Found in your UPI app under transaction details.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#E11D48]/10 border border-[#E11D48]/20 text-[#E11D48] text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !utr}
                      className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-[#0B0F17] font-semibold transition text-sm flex items-center justify-center gap-2 shadow-md shadow-[#F59E0B]/20"
                    >
                      {submitting ? "Verifying..." : "Submit UTR"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default UpiPaymentModal;