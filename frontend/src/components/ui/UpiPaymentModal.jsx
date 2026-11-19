import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { buildUpiUri } from "../../utils/upiQrGenerator.js";
import { formatINR } from "../../utils/formatCurrency.js";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as billingService from "../../services/billingService.js";

export function UpiPaymentModal({ isOpen, onClose, bill, onSuccess }) {
  const { upiVpa: contextVpa, societyName: contextSocietyName } = useSocietyConfig();
  const [activeTab, setActiveTab] = useState("instant"); // 'instant' | 'manual'
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Dynamic Session State
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedUtr, setConfirmedUtr] = useState("");

  // Manual UTR Fallback State
  const [manualUtr, setManualUtr] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSubmittedSuccess, setManualSubmittedSuccess] = useState(false);

  const pollTimerRef = useRef(null);

  // Initialize or reset session when modal opens
  useEffect(() => {
    if (!isOpen || !bill) {
      setSession(null);
      setIsSuccess(false);
      setConfirmedUtr("");
      setManualUtr("");
      setManualError("");
      setManualSubmittedSuccess(false);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    let isMounted = true;
    setSessionLoading(true);
    setSessionError("");

    async function initSession() {
      try {
        const data = await billingService.createUpiPaymentSession(bill.id);
        if (isMounted) {
          setSession(data);
          setSessionLoading(false);
        }
      } catch (err) {
        console.warn("Could not initiate dynamic UPI session, falling back to static URI:", err);
        if (isMounted) {
          setSessionError("Dynamic listener offline. Scanning will still work via standard UPI.");
          setSessionLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, bill]);

  // Poller for dynamic session status
  useEffect(() => {
    if (!session || !session.referenceId || isSuccess) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await billingService.getUpiSessionStatus(session.referenceId);
        if (res.status === "SUCCESS") {
          setIsSuccess(true);
          setConfirmedUtr(res.utr || session.referenceId);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (onSuccess) onSuccess();
        }
      } catch (err) {
        // Silently continue polling
      }
    };

    pollTimerRef.current = setInterval(checkStatus, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [session, isSuccess, onSuccess]);

  if (!isOpen || !bill) return null;

  const totalAmount = Number(bill.total_amount || 0);
  const effectiveVpa = session?.vpa || contextVpa || "9525621552@upi";
  const effectiveName = session?.payeeName || contextSocietyName || "VastuLedger Society";

  // Use session intent URI if available; otherwise compute static URI
  const effectiveQrValue =
    session?.upiIntentUri ||
    buildUpiUri({
      vpa: effectiveVpa,
      payeeName: effectiveName,
      amount: totalAmount,
      billId: bill.id,
      flatNumber: bill.flat_number || `Unit ${bill.flat_id}`,
      referenceId: session?.referenceId,
    });

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(effectiveVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleCopyRef = () => {
    if (!session?.referenceId) return;
    navigator.clipboard.writeText(session.referenceId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleOpenUpiApp = () => {
    if (effectiveQrValue) {
      window.location.href = effectiveQrValue;
    }
  };

  const handleManualSubmitUtr = async (e) => {
    e.preventDefault();
    setManualError("");

    const cleanUtr = manualUtr.trim();
    if (!cleanUtr || cleanUtr.length < 10) {
      setManualError("Please enter a valid 12-digit UPI UTR / Bank Reference Number");
      return;
    }

    setManualSubmitting(true);
    try {
      await billingService.submitUtr({
        billId: bill.id,
        utr: cleanUtr,
        amount: totalAmount,
      });

      setManualSubmittedSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setManualError(err.response?.data?.detail || err.message || "Failed to submit UTR reference");
    } finally {
      setManualSubmitting(false);
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
              <div className="p-2.5 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Direct Sovereign UPI Gateway
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#14B8A6]/20 text-[#14B8A6] uppercase tracking-wider">
                    0% MDR
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bill #{bill.id} • Flat {bill.flat_number || bill.flat_id} • {bill.billing_cycle || "Current Cycle"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Instant Auto-Settled Confirmation State */}
          {isSuccess ? (
            <div className="p-8 text-center space-y-4">
              <motion.div
                initial={{ scale: 0.5, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-16 h-16 mx-auto rounded-full bg-[#14B8A6]/20 border-2 border-[#14B8A6] flex items-center justify-center text-[#14B8A6] shadow-lg shadow-[#14B8A6]/20"
              >
                <ShieldCheck className="w-9 h-9" />
              </motion.div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#14B8A6]/15 text-[#14B8A6] border border-[#14B8A6]/30">
                  <Sparkles className="w-3.5 h-3.5" /> Webhook Confirmed • Auto-Reconciled
                </span>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white pt-2">
                  Payment of {formatINR(totalAmount)} Settled!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Direct bank webhook verified your payment. Bill #{bill.id} has been marked as PAID and chained into the society tamper-proof ledger.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs font-mono space-y-1 text-left max-w-sm mx-auto">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Reference ID:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{session?.referenceId || "Direct"}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Bank UTR:</span>
                  <span className="font-semibold text-[#14B8A6]">{confirmedUtr}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-semibold bg-[#14B8A6] hover:bg-[#0D9488] text-white transition text-sm shadow-md shadow-[#14B8A6]/20"
                >
                  Done & Return to Ledger
                </button>
              </div>
            </div>
          ) : manualSubmittedSuccess ? (
            /* Manual UTR Submitted State */
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B]">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  UTR Reference Submitted
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                  UTR <span className="font-mono font-medium text-[#F59E0B]">{manualUtr}</span> for {formatINR(totalAmount)} has been routed to the Treasurer reconciliation queue.
                </p>
              </div>
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
            /* Main Payment View with Tabs */
            <div className="p-6 space-y-5">
              {/* Tab Navigation */}
              <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("instant")}
                  className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === "instant"
                      ? "bg-[var(--bg-card)] text-slate-900 dark:text-white shadow-sm font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-[#14B8A6]" />
                  Scan & Auto-Settle
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === "manual"
                      ? "bg-[var(--bg-card)] text-slate-900 dark:text-white shadow-sm font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 text-[#F59E0B]" />
                  Enter UTR Manually
                </button>
              </div>

              {activeTab === "instant" ? (
                <>
                  {/* QR Code and Payment Details */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <div className="relative p-3 bg-white rounded-2xl shadow-md shrink-0">
                      {sessionLoading ? (
                        <div className="w-[140px] h-[140px] flex flex-col items-center justify-center text-slate-400 gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#14B8A6]" />
                          <span className="text-[10px] font-medium">Generating Session...</span>
                        </div>
                      ) : (
                        <QRCodeSVG
                          value={effectiveQrValue}
                          size={140}
                          level="M"
                          includeMargin={false}
                        />
                      )}
                    </div>
                    <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                      <span className="text-[11px] font-semibold tracking-wider uppercase text-[#14B8A6] flex items-center justify-center sm:justify-start gap-1">
                        <Smartphone className="w-3.5 h-3.5" /> Scan via GPay / PhonePe / Paytm / BHIM
                      </span>
                      <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-numbers">
                        {formatINR(totalAmount)}
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                        <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] truncate max-w-[200px]">
                          {effectiveVpa}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyVpa}
                          className="p-1.5 text-slate-500 hover:text-[#14B8A6] dark:text-slate-400 rounded-md transition"
                          title="Copy UPI ID"
                        >
                          {copiedVpa ? <Check className="w-4 h-4 text-[#14B8A6]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {session?.referenceId && (
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Ref:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {session.referenceId}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyRef}
                            className="p-0.5 hover:text-[#14B8A6]"
                            title="Copy Ref"
                          >
                            {copiedRef ? <Check className="w-3 h-3 text-[#14B8A6]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile 1-Tap Trigger (visible especially on mobile or for intent testing) */}
                  <div className="sm:hidden">
                    <button
                      type="button"
                      onClick={handleOpenUpiApp}
                      className="w-full py-2.5 rounded-xl font-semibold bg-[#14B8A6] hover:bg-[#0D9488] text-white transition text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Installed UPI App (PhonePe / GPay)
                    </button>
                  </div>

                  {/* Radar Status Tracker */}
                  <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#14B8A6]"></span>
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Awaiting Bank Webhook Settlement
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Valid 30 mins</span>
                    </div>
                  </div>

                  {sessionError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{sessionError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm font-medium"
                    >
                      Close Window
                    </button>
                  </div>
                </>
              ) : (
                /* Manual UTR Submission Form */
                <form onSubmit={handleManualSubmitUtr} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm Bank Reference (12-Digit UPI UTR)
                    </label>
                    <input
                      type="text"
                      maxLength={22}
                      value={manualUtr}
                      onChange={(e) => setManualUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                      placeholder="e.g. 412306789012"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-[#F59E0B] transition"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Found in your UPI app under transaction details after transferring {formatINR(totalAmount)} to <span className="font-mono text-slate-700 dark:text-slate-300">{effectiveVpa}</span>.
                    </p>
                  </div>

                  {manualError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#E11D48]/10 border border-[#E11D48]/20 text-[#E11D48] text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{manualError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("instant")}
                      className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm font-medium"
                    >
                      Back to QR
                    </button>
                    <button
                      type="submit"
                      disabled={manualSubmitting || !manualUtr}
                      className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-[#0B0F17] font-semibold transition text-sm flex items-center justify-center gap-2 shadow-md shadow-[#F59E0B]/20"
                    >
                      {manualSubmitting ? "Submitting..." : "Submit UTR"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default UpiPaymentModal;
