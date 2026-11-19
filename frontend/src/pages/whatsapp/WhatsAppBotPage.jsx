import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Send,
  CheckCheck,
  Eye,
  AlertTriangle,
  Zap,
  Settings,
  Bell,
  RefreshCw,
  Search,
  Filter,
  Phone,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  X,
  Sparkles,
  Smartphone,
  Check,
  Copy,
  Clock,
  Radio,
} from "lucide-react";
import * as whatsappService from "../../services/whatsappService.js";
import { formatINR } from "../../utils/formatCurrency.js";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";

export default function WhatsAppBotPage() {
  const { societyName, upiVpa } = useSocietyConfig();

  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    deliveryRate: 100,
    readRate: 0,
    byType: { billDispatches: 0, reminders: 0, receipts: 0, broadcasts: 0 },
  });
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");

  // Selected message for preview
  const [previewTemplate, setPreviewTemplate] = useState("BILL_DISPATCH");
  const [activeLogPreview, setActiveLogPreview] = useState(null);

  // Modals
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    urgency: "HIGH",
  });
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);

  const [remindersModalOpen, setRemindersModalOpen] = useState(false);
  const [remindersSubmitting, setRemindersSubmitting] = useState(false);
  const [remindersResult, setRemindersResult] = useState(null);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    verifyToken: "",
    autoDispatchBills: false,
    autoDueReminders: false,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [actionNotice, setActionNotice] = useState(null);

  const showNotice = (msg, isError = false) => {
    setActionNotice({ text: msg, isError });
    setTimeout(() => setActionNotice(null), 4500);
  };

  const loadData = async () => {
    try {
      const [statsData, logsData, configData] = await Promise.all([
        whatsappService.getWhatsAppStats(),
        whatsappService.getWhatsAppLogs(),
        whatsappService.getWhatsAppConfig(),
      ]);
      setStats(statsData || stats);
      setLogs(logsData || []);
      setConfig(configData || null);
      if (configData) {
        setSettingsForm({
          phoneNumberId: configData.phoneNumberId || "",
          businessAccountId: configData.businessAccountId || "",
          accessToken: configData.accessToken || "",
          verifyToken: configData.verifyToken || "",
          autoDispatchBills: Boolean(configData.autoDispatchBills),
          autoDueReminders: Boolean(configData.autoDueReminders),
        });
      }
    } catch (err) {
      console.error("Failed to load WhatsApp dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendBatchReminders = async () => {
    setRemindersSubmitting(true);
    try {
      const res = await whatsappService.sendBatchDueReminders();
      setRemindersResult(res.data);
      showNotice(res.message || "Payment reminders sent successfully!");
      loadData();
    } catch (err) {
      showNotice(err.response?.data?.error || err.message || "Failed to dispatch reminders", true);
    } finally {
      setRemindersSubmitting(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;

    setBroadcastSubmitting(true);
    try {
      const res = await whatsappService.sendBroadcast(broadcastForm);
      showNotice(res.message || "Emergency broadcast sent to all residents!");
      setBroadcastModalOpen(false);
      setBroadcastForm({ title: "", message: "", urgency: "HIGH" });
      loadData();
    } catch (err) {
      showNotice(err.response?.data?.error || err.message || "Failed to broadcast message", true);
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await whatsappService.updateWhatsAppConfig(settingsForm);
      showNotice("WhatsApp Cloud API settings and trigger policies saved!");
      setSettingsModalOpen(false);
      loadData();
    } catch (err) {
      showNotice(err.response?.data?.error || err.message || "Failed to save configuration", true);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesType = selectedType === "ALL" || log.message_type === selectedType;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.recipient_name?.toLowerCase().includes(q) ||
      log.recipient_phone?.toLowerCase().includes(q) ||
      log.flat_number?.toLowerCase().includes(q) ||
      log.template_name?.toLowerCase().includes(q) ||
      log.message_body?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Sample dynamic previews for phone screen
  const sampleMessages = {
    BILL_DISPATCH: [
      `🏛️ *${societyName || "Vastu Heights CHS"}* - Official Maintenance Bill`,
      ``,
      `Dear *Rajesh Kulkarni*,`,
      `Your maintenance bill for *Flat A-101* (2026-06) has been generated.`,
      ``,
      `💰 *Total Amount Due:* ₹5,300`,
      `📅 *Due Date:* 15 Jun 2026`,
      ``,
      `⚡ *Instant 0% Fee UPI Payment:*`,
      `Tap below to open PhonePe / GPay / BHIM:`,
      `upi://pay?pa=${upiVpa || "9525621552@upi"}&pn=VastuHeights&am=5300&tr=VL-BILL-101`,
      ``,
      `_Receipt and audit ledger hash will be instantly recorded upon bank settlement._`,
    ].join("\n"),

    PAYMENT_REMINDER: [
      `⚠️ *Payment Reminder - ${societyName || "Vastu Heights CHS"}*`,
      ``,
      `Dear *Priya Deshmukh*,`,
      `This is a gentle reminder that maintenance dues of *₹7,590* for *Flat A-204* remain pending.`,
      ``,
      `📅 *Due Date:* 15 Jun 2026`,
      ``,
      `Please settle before the due date to avoid the 18% p.a. statutory late-fee interest.`,
      ``,
      `⚡ *Instant UPI Payment Link:*`,
      `upi://pay?pa=${upiVpa || "9525621552@upi"}&pn=VastuHeights&am=7590&tr=VL-REM-204`,
    ].join("\n"),

    RECEIPT_CONFIRMATION: [
      `✅ *Payment Received & Verified - ${societyName || "Vastu Heights CHS"}*`,
      ``,
      `Dear *Rajesh Kulkarni*,`,
      `We have confirmed receipt of *₹5,300* for *Flat A-101* (2026-06).`,
      ``,
      `🏦 *Bank Reference / UTR:* 412306789012`,
      `🔒 *Ledger Crypt-Hash:* e3b0c44298fc1c14...`,
      ``,
      `Your official society maintenance receipt has been marked PAID and permanently chained in the society audit ledger.`,
    ].join("\n"),

    EMERGENCY_BROADCAST: [
      `🚨 *URGENT NOTICE: ${societyName || "Vastu Heights CHS"}*`,
      `*OVERHEAD WATER TANK CLEANING*`,
      ``,
      `Water supply will be suspended tomorrow from 10:00 AM to 3:00 PM for bi-annual deep sanitization. Please store sufficient water.`,
      ``,
      `Priority: *HIGH*`,
      `Issued By: *Managing Committee*`,
    ].join("\n"),
  };

  const activePreviewText = activeLogPreview?.message_body || sampleMessages[previewTemplate] || sampleMessages.BILL_DISPATCH;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-medium backdrop-blur-md ${
              actionNotice.isError
                ? "bg-rose-500/90 text-white border-rose-600 shadow-rose-500/20"
                : "bg-emerald-600/90 text-white border-emerald-500 shadow-emerald-500/20"
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span>{actionNotice.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#25D366]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  WhatsApp Cloud Bot & Instant Messaging Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                  {config?.isConfigured ? "Meta Cloud API Live" : "Sovereign Dispatch Engine"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct resident engagement — monthly bill alerts, 1-tap UPI payment intents, due date reminders, and emergency broadcasts.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Refresh logs & statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-xs font-semibold flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            API & Triggers
          </button>

          <button
            onClick={() => setBroadcastModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 transition text-xs font-semibold flex items-center gap-1.5"
          >
            <Radio className="w-4 h-4" />
            Emergency Broadcast
          </button>

          <button
            onClick={() => setRemindersModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-bold transition text-xs flex items-center gap-1.5 shadow-lg shadow-[#25D366]/20"
          >
            <Send className="w-4 h-4" />
            Send Reminders to Pending Flats
          </button>
        </div>
      </div>

      {/* Telemetry Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Messages</span>
            <Send className="w-4 h-4 text-[#25D366]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats.byType?.billDispatches || 0} bills • {stats.byType?.reminders || 0} reminders
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Delivery Rate</span>
            <CheckCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.deliveryRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            {stats.delivered + stats.read} confirmed delivered
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Read Status</span>
            <Eye className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono">
            {stats.readRate}%
          </div>
          <div className="text-[11px] text-slate-500">
            {stats.read} residents opened message
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Automated Triggers</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white pt-1">
            {config?.autoDispatchBills ? "Active on 1st" : "Manual / On-Demand"}
          </div>
          <div className="text-[11px] text-slate-500">
            {config?.autoDueReminders ? "Auto 3-day due reminder" : "Reminders manual"}
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Activity Table & Live Smartphone Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Activity & Delivery Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#25D366]" />
                WhatsApp Communication Logs
              </h3>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search flat, name, phone..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#25D366] transition w-44"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#25D366]"
                >
                  <option value="ALL">All Types</option>
                  <option value="BILL_DISPATCH">Bill Alerts</option>
                  <option value="PAYMENT_REMINDER">Due Reminders</option>
                  <option value="RECEIPT_CONFIRMATION">Receipts</option>
                  <option value="EMERGENCY_BROADCAST">Broadcasts</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Recipient</th>
                    <th className="py-2.5 px-3 font-semibold">Type</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]/50">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        No WhatsApp logs found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className={`hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer ${
                          activeLogPreview?.id === log.id ? "bg-[#25D366]/10" : ""
                        }`}
                        onClick={() => setActiveLogPreview(log)}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.recipient_name || "Society Resident"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            {log.flat_number && (
                              <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 font-sans font-medium text-slate-700 dark:text-slate-300">
                                Flat {log.flat_number}
                              </span>
                            )}
                            <span>{log.recipient_phone}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              log.message_type === "BILL_DISPATCH"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                : log.message_type === "PAYMENT_REMINDER"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : log.message_type === "RECEIPT_CONFIRMATION"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {log.message_type?.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.status === "DELIVERED" || log.status === "READ"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : log.status === "FAILED"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {log.status === "DELIVERED" || log.status === "READ" ? (
                              <CheckCheck className="w-3 h-3 text-[#25D366]" />
                            ) : null}
                            {log.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                          {new Date(log.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#25D366] transition"
                            title="Preview message on screen"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Live WhatsApp Smartphone Preview */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#25D366]" />
                Live Smartphone Simulation
              </h3>
              {activeLogPreview && (
                <button
                  onClick={() => setActiveLogPreview(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Reset Sample
                </button>
              )}
            </div>

            {/* Template Selector Pills (When not inspecting a specific log) */}
            {!activeLogPreview && (
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "BILL_DISPATCH", label: "Bill Alert" },
                  { key: "PAYMENT_REMINDER", label: "Due Reminder" },
                  { key: "RECEIPT_CONFIRMATION", label: "Receipt" },
                  { key: "EMERGENCY_BROADCAST", label: "Broadcast" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setPreviewTemplate(t.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                      previewTemplate === t.key
                        ? "bg-[#25D366] text-slate-950 font-bold shadow-sm"
                        : "bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Realistic Smartphone Chassis */}
            <div className="w-full max-w-[340px] mx-auto rounded-[38px] p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl overflow-hidden relative">
              {/* Speaker / Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-600 rounded-full"></div>
              </div>

              {/* WhatsApp App Screen Container */}
              <div className="rounded-[28px] overflow-hidden bg-[#0B141A] text-slate-100 flex flex-col h-[460px] text-xs shadow-inner">
                {/* WhatsApp Chat Top Header */}
                <div className="bg-[#1F2C34] px-3.5 py-2.5 flex items-center justify-between border-b border-[#2A3942]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center text-white font-bold text-xs shrink-0">
                      VL
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-xs truncate flex items-center gap-1">
                        {societyName || "Vastu Heights CHS"}
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00A884] shrink-0" />
                      </div>
                      <div className="text-[10px] text-[#8696A0]">Official Society Bot</div>
                    </div>
                  </div>
                  <div className="p-1 rounded text-[#8696A0]">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Chat Body Wallpaper */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:12px_12px]">
                  {/* Encrypted Notice Banner */}
                  <div className="p-2 rounded-lg bg-[#182229] border border-[#222E35] text-[10px] text-[#FFD279] text-center max-w-[280px] mx-auto">
                    🔒 Messages are end-to-end encrypted with VastuLedger Sovereign Gateway.
                  </div>

                  {/* WhatsApp Message Bubble */}
                  <motion.div
                    key={activePreviewText}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 rounded-2xl rounded-tl-sm bg-[#005C4B] text-slate-100 max-w-[92%] shadow-md space-y-2"
                  >
                    <div className="whitespace-pre-line text-[11px] leading-relaxed">
                      {activePreviewText}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200 pt-1">
                      <span>11:30 AM</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                    </div>
                  </motion.div>

                  {/* Interactive Button Preview */}
                  <div className="space-y-1.5 pt-1">
                    <div className="p-2 rounded-xl bg-[#1F2C34] text-center text-[#53BDEB] font-semibold text-[11px] border border-[#2A3942] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#2A3942] transition">
                      <ExternalLink className="w-3 h-3" />
                      ⚡ Pay via UPI (PhonePe / GPay)
                    </div>
                  </div>
                </div>

                {/* Bottom WhatsApp Input Bar Simulation */}
                <div className="bg-[#1F2C34] p-2 flex items-center gap-2 border-t border-[#2A3942]">
                  <div className="flex-1 px-3 py-1.5 rounded-full bg-[#2A3942] text-[11px] text-[#8696A0]">
                    Type a message...
                  </div>
                  <div className="p-2 rounded-full bg-[#00A884] text-white">
                    <Send className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Emergency Broadcast Composer */}
      <AnimatePresence>
        {broadcastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Dispatch Emergency WhatsApp Broadcast
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dispatches direct high-priority alerts to all registered resident mobile numbers.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBroadcastModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSendBroadcast} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Announcement Headline / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                    placeholder="e.g. Overhead Water Tank Cleaning Tomorrow"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Urgency Priority
                  </label>
                  <select
                    value={broadcastForm.urgency}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, urgency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  >
                    <option value="NORMAL">Normal Notice</option>
                    <option value="HIGH">High Priority</option>
                    <option value="EMERGENCY">Emergency Alert (Water / Lift / Fire)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notice Description / Message
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    placeholder="Provide details regarding the shutdown, maintenance work, or society meeting..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  ></textarea>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ This broadcast will ping all registered flat owners across all active wings.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcastSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    {broadcastSubmitting ? "Dispatching..." : "Send Broadcast Now"}
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Batch Payment Reminders Confirmation */}
      <AnimatePresence>
        {remindersModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl p-6 text-[var(--text-primary)] space-y-4"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] flex items-center justify-center mx-auto">
                  <Send className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Send WhatsApp Reminders to Unpaid Flats
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The bot will scan all pending maintenance bills, generate personalized 1-tap UPI payment intents, and deliver them directly to resident WhatsApp numbers.
                </p>
              </div>

              {remindersResult ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2 text-center">
                  <CheckCheck className="w-6 h-6 text-emerald-500 mx-auto" />
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    Dispatched to {remindersResult.sentCount} flats!
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Delivery confirmations logged in your activity stream.
                  </p>
                  <button
                    onClick={() => {
                      setRemindersModalOpen(false);
                      setRemindersResult(null);
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-[#25D366] text-slate-950 font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRemindersModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={remindersSubmitting}
                    onClick={handleSendBatchReminders}
                    className="flex-1 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    {remindersSubmitting ? "Dispatching..." : "Send Reminders Now"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: WhatsApp Cloud API & Automated Triggers Settings */}
      <AnimatePresence>
        {settingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#25D366]/15 text-[#25D366]">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      WhatsApp Cloud API & Trigger Settings
                    </h3>
                    <p className="text-xs text-slate-500">
                      Connect Meta Graph API credentials or configure automated trigger policies.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={settingsForm.phoneNumberId}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phoneNumberId: e.target.value })}
                    placeholder="e.g. 104829104829102 (Leave empty for Sovereign Simulator)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Permanent Access Token (Bearer)
                  </label>
                  <input
                    type="password"
                    value={settingsForm.accessToken}
                    onChange={(e) => setSettingsForm({ ...settingsForm, accessToken: e.target.value })}
                    placeholder="EAAGm..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Webhook Verification Token
                  </label>
                  <input
                    type="text"
                    value={settingsForm.verifyToken}
                    onChange={(e) => setSettingsForm({ ...settingsForm, verifyToken: e.target.value })}
                    placeholder="vastu_ledger_whatsapp_verify_secret_2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>

                {/* Automated Triggers */}
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white">Automated Bot Policies</h4>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.autoDispatchBills}
                      onChange={(e) => setSettingsForm({ ...settingsForm, autoDispatchBills: e.target.checked })}
                      className="rounded border-[var(--border-input)] text-[#25D366] focus:ring-0"
                    />
                    <span>Auto-dispatch WhatsApp invoice whenever monthly bills are generated on 1st</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.autoDueReminders}
                      onChange={(e) => setSettingsForm({ ...settingsForm, autoDueReminders: e.target.checked })}
                      className="rounded border-[var(--border-input)] text-[#25D366] focus:ring-0"
                    />
                    <span>Auto-send due reminder 3 days prior to due date to prevent late fees</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="flex-1 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-slate-950 font-bold"
                  >
                    {settingsSaving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
