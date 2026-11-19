import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Save,
  Sliders,
  History,
  Users,
  Building,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  X,
  User,
  Building2,
  Shield,
  Search,
  Filter,
  Calendar,
  FileSpreadsheet,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  KeyRound,
  CreditCard,
} from "lucide-react";
import GlassCard from "../../components/ui/GlassCard.jsx";
import { formatDate } from "../../utils/formatCurrency.js";
import { generateAgmFinancialPackPDF } from "../../utils/pdfExporter.js";
import { getAgmPackage } from "../../services/governanceService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as adminService from "../../services/adminService.js";
import SocietyTopologyManager from "../../components/admin/SocietyTopologyManager.jsx";

export function AdminControlPanelPage() {
  const { user: currentUser } = useAuth();
  const { settings, reloadSettings, currentSocietyId } = useSocietyConfig();
  const [activeTab, setActiveTab] = useState("rules");
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* Audit Trail State */
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActions, setAuditActions] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [exportingAgmPack, setExportingAgmPack] = useState(false);

  /* Users & Flats State */
  const [usersList, setUsersList] = useState([]);
  const [flatsList, setFlatsList] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  /* User modal state */
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userEdit, setUserEdit] = useState(null);
  const [userForm, setUserForm] = useState({ email: "", password: "", fullName: "", role: "RESIDENT", flatId: "" });
  const [userSaving, setUserSaving] = useState(false);

  /* Flat modal state */
  const [flatModalOpen, setFlatModalOpen] = useState(false);
  const [flatEdit, setFlatEdit] = useState(null);
  const [flatForm, setFlatForm] = useState({ wing: "", number: "", address: "", areaSqft: "", bhk: "2BHK", isOccupied: true });
  const [flatSaving, setFlatSaving] = useState(false);

  /* Delete confirm state */
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  /* Rotate Bank Master state */
  const [rotateBankModalOpen, setRotateBankModalOpen] = useState(false);
  const [rotateBankForm, setRotateBankForm] = useState({
    bankName: "",
    ifscCode: "",
    accountNumber: "",
    confirmAccountNumber: "",
    upiVpa: "",
    adminPassword: "",
    reason: "",
  });
  const [rotateBankSaving, setRotateBankSaving] = useState(false);
  const [rotateBankError, setRotateBankError] = useState("");
  const [bankSuccessMsg, setBankSuccessMsg] = useState("");

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const data = await adminService.getAuditLogs({
        limit: 25,
        offset: (auditPage - 1) * 25,
        action: auditActionFilter !== "ALL" ? auditActionFilter : undefined,
        search: auditSearch.trim() || undefined,
        startDate: auditStartDate || undefined,
        endDate: auditEndDate || undefined,
      });

      if (data && typeof data === "object" && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
        setAuditTotal(data.total || 0);
        if (Array.isArray(data.availableActions)) {
          setAuditActions(data.availableActions);
        }
      } else if (Array.isArray(data)) {
        setAuditLogs(data);
        setAuditTotal(data.length);
      } else {
        setAuditLogs([]);
        setAuditTotal(0);
      }
    } catch (err) {
      console.warn("[AdminControlPanel] Failed to fetch audit logs:", err.message);
      setAuditLogs([]);
      setAuditTotal(0);
    } finally {
      setLoadingAudit(false);
    }
  }, [auditPage, auditActionFilter, auditSearch, auditStartDate, auditEndDate, currentSocietyId]);

  const fetchUsersAndFlats = useCallback(async () => {
    setLoadingExtras(true);
    try {
      const [u, f] = await Promise.all([
        adminService.listUsers(),
        adminService.listFlats(),
      ]);
      setUsersList(Array.isArray(u) ? u : []);
      setFlatsList(Array.isArray(f) ? f : []);
    } catch {
      setUsersList([]);
      setFlatsList([]);
    } finally {
      setLoadingExtras(false);
    }
  }, [currentSocietyId]);

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    } else if (activeTab === "users") {
      fetchUsersAndFlats();
    }
  }, [activeTab, fetchAuditLogs, fetchUsersAndFlats]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await adminService.bulkUpdateSettings(form);
      await reloadSettings();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  };

  const handleExportCSV = () => {
    if (!auditLogs || auditLogs.length === 0) return;
    const headers = [
      "Log ID",
      "Occurred At",
      "Operator Name",
      "Operator Email",
      "Role",
      "Action",
      "Entity Type",
      "Entity ID",
      "IP Address",
      "Details",
    ];
    const rows = auditLogs.map((log) => [
      log.id,
      `"${new Date(log.occurred_at).toISOString()}"`,
      `"${(log.full_name || "").replace(/"/g, '""')}"`,
      `"${(log.email || "").replace(/"/g, '""')}"`,
      `"${log.user_role || ""}"`,
      `"${log.action}"`,
      `"${log.entity_type || ""}"`,
      log.entity_id || "",
      `"${log.ip_address || ""}"`,
      `"${(typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `VastuLedger_AuditLog_Society${currentSocietyId}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAgmPack = async () => {
    setExportingAgmPack(true);
    try {
      const agmPackage = await getAgmPackage();
      generateAgmFinancialPackPDF({ agmPackage });
    } catch (err) {
      alert("Failed to export Statutory AGM Financial Pack: " + (err.response?.data?.message || err.message));
    } finally {
      setExportingAgmPack(false);
    }
  };

  const handleOpenRotateBankModal = () => {
    setRotateBankForm({
      bankName: form.SOCIETY_BANK_NAME || "HDFC Bank",
      ifscCode: form.SOCIETY_BANK_IFSC || "HDFC0001234",
      accountNumber: "",
      confirmAccountNumber: "",
      upiVpa: form.SOCIETY_UPI_VPA || "9923812557@upi",
      adminPassword: "",
      reason: "",
    });
    setRotateBankError("");
    setRotateBankModalOpen(true);
  };

  const handleRotateBankSubmit = async (e) => {
    e.preventDefault();
    setRotateBankError("");

    if (rotateBankForm.accountNumber !== rotateBankForm.confirmAccountNumber) {
      setRotateBankError("Bank account numbers do not match.");
      return;
    }

    setRotateBankSaving(true);
    try {
      const res = await adminService.rotateBankMaster({
        bankName: rotateBankForm.bankName.trim(),
        ifscCode: rotateBankForm.ifscCode.trim().toUpperCase(),
        accountNumber: rotateBankForm.accountNumber.trim(),
        confirmAccountNumber: rotateBankForm.confirmAccountNumber.trim(),
        upiVpa: rotateBankForm.upiVpa.trim(),
        adminPassword: rotateBankForm.adminPassword,
        reason: rotateBankForm.reason.trim(),
      });

      setBankSuccessMsg(`Bank Master successfully rotated to ${res.bankMask} ✓`);
      setRotateBankModalOpen(false);
      await reloadSettings();
      await fetchAuditLogs();
      setTimeout(() => setBankSuccessMsg(""), 5000);
    } catch (err) {
      setRotateBankError(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          err.message ||
          "Failed to rotate bank master"
      );
    } finally {
      setRotateBankSaving(false);
    }
  };

  const handleResetAuditFilters = () => {
    setAuditSearch("");
    setAuditActionFilter("ALL");
    setAuditStartDate("");
    setAuditEndDate("");
    setAuditPage(1);
  };

  /* ---------------- User CRUD handlers ---------------- */
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setUserSaving(true);
    try {
      const payload = {
        email: userForm.email.trim(),
        password: userForm.password,
        fullName: userForm.fullName.trim(),
        role: userForm.role,
        flatId: userForm.flatId ? Number(userForm.flatId) : null,
      };
      if (userEdit) {
        await adminService.updateUser(userEdit.id, payload);
      } else {
        await adminService.createUser(payload);
      }
      setUserModalOpen(false);
      setUserForm({ email: "", password: "", fullName: "", role: "RESIDENT", flatId: "" });
      setUserEdit(null);
      await fetchExtras();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to save user");
    } finally {
      setUserSaving(false);
    }
  };

  /* ---------------- Flat CRUD handlers ---------------- */
  const handleFlatSubmit = async (e) => {
    e.preventDefault();
    setFlatSaving(true);
    try {
      const payload = {
        wing: flatForm.wing.trim().toUpperCase(),
        number: flatForm.number.trim(),
        address: flatForm.address.trim() || null,
        areaSqft: Number(flatForm.areaSqft),
        bhk: flatForm.bhk,
        isOccupied: flatForm.isOccupied,
      };
      if (flatEdit) {
        await adminService.updateFlat(flatEdit.id, payload);
      } else {
        await adminService.createFlat(payload);
      }
      setFlatModalOpen(false);
      setFlatForm({ wing: "", number: "", address: "", areaSqft: "", bhk: "2BHK", isOccupied: true });
      setFlatEdit(null);
      await fetchExtras();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to save flat");
    } finally {
      setFlatSaving(false);
    }
  };

  /* ---------------- Delete confirm handler ---------------- */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isSuperadmin) {
      alert("Security Violation: SuperAdmin platform owner accounts are protected and cannot be deleted.");
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      return;
    }
    setDeleteSaving(true);
    try {
      if (deleteTarget.type === "user") {
        await adminService.deleteUser(deleteTarget.id);
      } else {
        await adminService.deleteFlat(deleteTarget.id);
      }
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await fetchExtras();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to delete");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
            Admin Society Control Panel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dynamic society formula configuration, Maker-Checker threshold tuning, and immutable audit trail.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/30 text-[#14B8A6] text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Rules Saved to Database ✓</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab("topology")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "topology"
              ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Society Topology (Wings & Flats)</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "rules"
              ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Dynamic Society Rules</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "audit"
              ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>System Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "users"
              ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users & Residents</span>
        </button>
      </div>

      {activeTab === "topology" ? (
        <SocietyTopologyManager />
      ) : activeTab === "rules" ? (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Section 1: Maintenance Billing Engine */}
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F59E0B]">
              1. Maintenance Calculation Mode & Slabs
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Calculation Formula Mode
                </label>
                <select
                  value={form.MAINTENANCE_MODE || "FLAT_SQFT"}
                  onChange={(e) => setForm({ ...form, MAINTENANCE_MODE: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs"
                >
                  <option value="FLAT_SQFT">FLAT_SQFT (Per Sq. Ft Rate)</option>
                  <option value="FIXED_BHK">FIXED_BHK (1BHK/2BHK/3BHK Flat Slab)</option>
                  <option value="HYBRID">HYBRID (Fixed Base + Sq. Ft Variable)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rate Per Sq. Ft (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.MAINTENANCE_RATE_SQFT || ""}
                  onChange={(e) => setForm({ ...form, MAINTENANCE_RATE_SQFT: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Billing Cycle Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={form.BILLING_CYCLE_DAY || 1}
                  onChange={(e) => setForm({ ...form, BILLING_CYCLE_DAY: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sinking Fund Reserve (%)</label>
                <input
                  type="number"
                  value={form.SINKING_FUND_PCT || ""}
                  onChange={(e) => setForm({ ...form, SINKING_FUND_PCT: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Repair Fund (%)</label>
                <input
                  type="number"
                  value={form.REPAIR_FUND_PCT || ""}
                  onChange={(e) => setForm({ ...form, REPAIR_FUND_PCT: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Non-Occupancy Surcharge (%)</label>
                <input
                  type="number"
                  value={form.NON_OCCUPANCY_CHARGE_PCT || ""}
                  onChange={(e) => setForm({ ...form, NON_OCCUPANCY_CHARGE_PCT: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>
            </div>
          </GlassCard>

          {/* Section 2: Late Fee & Maker-Checker Policy */}
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#14B8A6]">
              2. Overdue Penalties & Maker-Checker Approval Gate
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Grace Period Days</label>
                <input
                  type="number"
                  value={form.LATE_FEE_GRACE_DAYS || 10}
                  onChange={(e) => setForm({ ...form, LATE_FEE_GRACE_DAYS: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Late Fee Type</label>
                <select
                  value={form.LATE_FEE_TYPE || "SIMPLE_PERCENT"}
                  onChange={(e) => setForm({ ...form, LATE_FEE_TYPE: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs"
                >
                  <option value="SIMPLE_PERCENT">SIMPLE_PERCENT (% per annum)</option>
                  <option value="FIXED_DAILY">FIXED_DAILY (₹ Flat rate per day)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Late Fee Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.LATE_FEE_RATE || 18}
                  onChange={(e) => setForm({ ...form, LATE_FEE_RATE: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Maker-Checker Expense Limit (₹)
                </label>
                <input
                  type="number"
                  value={form.MAKER_CHECKER_THRESHOLD || 15000}
                  onChange={(e) => setForm({ ...form, MAKER_CHECKER_THRESHOLD: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono text-[#F59E0B] font-bold"
                />
              </div>
            </div>
          </GlassCard>

          {/* Section 3: Society Banking & Feature Toggles */}
          <GlassCard className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  3. Society UPI, Bank Master & Feature Toggles
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Secured banking endpoints, payment VPAs, and automated account masking.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenRotateBankModal}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 transition shadow-md shadow-purple-600/20 cursor-pointer w-fit"
                title="Rotate society bank master account with step-up admin authentication"
              >
                <KeyRound className="w-4 h-4" />
                Rotate Bank / UPI Master
              </button>
            </div>

            {bankSuccessMsg && (
              <div className="p-3 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{bankSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Active UPI VPA (Direct Inflows)
                </label>
                <input
                  type="text"
                  value={form.SOCIETY_UPI_VPA || ""}
                  onChange={(e) => setForm({ ...form, SOCIETY_UPI_VPA: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bank Account Display Mask (Public & Receipts)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.SOCIETY_BANK_MASK || ""}
                    onChange={(e) => setForm({ ...form, SOCIETY_BANK_MASK: e.target.value })}
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono font-semibold text-[#14B8A6]"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Society GSTIN</label>
                <input
                  type="text"
                  value={form.SOCIETY_GSTIN || ""}
                  onChange={(e) => setForm({ ...form, SOCIETY_GSTIN: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.FEATURE_3D_TOWER_VIEW === "true"}
                  onChange={() => handleToggle("FEATURE_3D_TOWER_VIEW")}
                  className="w-4 h-4 rounded text-[#F59E0B]"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-white">Enable 3D Tower Twin</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.FEATURE_RESIDENT_UPI_SELF_REPORT === "true"}
                  onChange={() => handleToggle("FEATURE_RESIDENT_UPI_SELF_REPORT")}
                  className="w-4 h-4 rounded text-[#F59E0B]"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-white">Resident UPI Self-Report</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.FEATURE_PUBLIC_VENDOR_RECEIPTS === "true"}
                  onChange={() => handleToggle("FEATURE_PUBLIC_VENDOR_RECEIPTS")}
                  className="w-4 h-4 rounded text-[#F59E0B]"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-white">Public Vendor Invoices</span>
              </label>
            </div>
          </GlassCard>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-[#F59E0B]/20"
            >
              <Save className="w-4 h-4" />
              {saving ? "Updating..." : "Deploy Live Rules"}
            </button>
          </div>
        </form>
      ) : activeTab === "audit" ? (
        /* Audit Trail Tab */
        <GlassCard className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Immutable Operational Audit Trail
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Statutory tracking of all administrative, financial, governance, and system operations
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
                Total: <strong className="text-slate-900 dark:text-white">{auditTotal}</strong> entries
              </span>
              <button
                onClick={handleExportCSV}
                disabled={auditLogs.length === 0}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Export CSV for Society Auditors & AGM"
              >
                <Download className="w-3.5 h-3.5 text-[#14B8A6]" />
                Export CSV
              </button>

              <button
                onClick={handleExportAgmPack}
                disabled={exportingAgmPack}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Download Official Statutory AGM Financial & Governance Audit Pack (PDF)"
              >
                <FileDown className="w-3.5 h-3.5 text-[#F59E0B]" />
                {exportingAgmPack ? "Compiling..." : "Statutory AGM Pack (PDF)"}
              </button>
            </div>
          </div>

          {/* Audit Filters Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--bg-canvas)] p-3 rounded-2xl border border-[var(--border-subtle)]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search operator, email, action..."
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
              />
            </div>

            {/* Action Dropdown */}
            <div className="relative">
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F59E0B] font-mono"
              >
                <option value="ALL">All Actions ({auditActions.length})</option>
                {auditActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range: From */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 shrink-0 font-medium">From:</span>
              <input
                type="date"
                value={auditStartDate}
                onChange={(e) => {
                  setAuditStartDate(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
              />
            </div>

            {/* Date Range: To + Reset */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 shrink-0 font-medium">To:</span>
              <input
                type="date"
                value={auditEndDate}
                onChange={(e) => {
                  setAuditEndDate(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
              />
              {(auditSearch || auditActionFilter !== "ALL" || auditStartDate || auditEndDate) && (
                <button
                  onClick={handleResetAuditFilters}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Log ID</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details / Payload</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {loadingAudit ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length > 0 ? (
                  auditLogs.map((log) => {
                    const actionColor =
                      log.action.includes("APPROVED") || log.action.includes("VERIFIED")
                        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                        : log.action.includes("REJECTED") || log.action.includes("DELETED")
                        ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                        : log.action.includes("UPDATED") || log.action.includes("SETTINGS")
                        ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                        : "text-blue-500 bg-blue-500/10 border-blue-500/20";

                    return (
                      <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">#{log.id}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.full_name || `User #${log.user_id}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {log.email || `ID: ${log.user_id}`}
                            {log.user_role && ` • ${log.user_role}`}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded border font-semibold ${actionColor}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {log.entity_type ? `${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ""}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-mono text-[11px] max-w-xs truncate">
                          {log.details ? (typeof log.details === "object" ? JSON.stringify(log.details) : log.details) : "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {log.ip_address || "—"}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {formatDate(log.occurred_at)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                            title="Inspect Raw Event Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No matching audit events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          {auditTotal > 25 && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs text-slate-500">
              <span>
                Showing {((auditPage - 1) * 25) + 1} to {Math.min(auditPage * 25, auditTotal)} of {auditTotal}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                  className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs px-2">
                  Page {auditPage} of {Math.ceil(auditTotal / 25)}
                </span>
                <button
                  onClick={() => setAuditPage((p) => (p * 25 < auditTotal ? p + 1 : p))}
                  disabled={auditPage * 25 >= auditTotal}
                  className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      ) : (
        /* Users and Flats Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Registered Society Officers & Residents</h3>
              <button
                onClick={() => {
                  setUserEdit(null);
                  setUserForm({ email: "", password: "", fullName: "", role: "RESIDENT", flatId: "" });
                  setUserModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14B8A6] text-[#0B0F17] text-xs font-semibold hover:bg-[#0f9d6e] transition shadow-sm shadow-[#14B8A6]/30"
              >
                <Plus className="w-3 h-3" /> Add User
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {usersList.length > 0 ? (
                usersList.map((u) => {
                  const isTargetSuper = Boolean(u.is_superadmin);
                  const isSelf = currentUser && u.id === currentUser.id;
                  const canDelete = !isTargetSuper && !isSelf && (currentUser?.isSuperadmin || u.role !== "ADMIN");
                  const canEdit = !isTargetSuper;

                  return (
                    <div key={u.id} className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white block">{u.full_name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-400">
                              (You)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isTargetSuper ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold border border-[#F59E0B]/40 shadow-xs">
                            <Shield className="w-3 h-3" /> SUPERADMIN (IMMUTABLE)
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-bold">
                            {u.role}
                          </span>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => {
                              setUserEdit(u);
                              setUserForm({
                                email: u.email || "",
                                password: "",
                                fullName: u.full_name || "",
                                role: u.role,
                                flatId: u.flat_id ?? "",
                              });
                              setUserModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#14B8A6] dark:text-slate-400 dark:hover:text-[#14B8A6] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                            title="Edit user"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => {
                              setDeleteTarget({ type: "user", id: u.id, label: u.full_name, isSuperadmin: isTargetSuper });
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#E11D48] dark:text-slate-400 dark:hover:text-[#E11D48] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                            title="Delete user"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">No users found.</div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Society Units (Wings A & B)</h3>
              <button
                onClick={() => {
                  setFlatEdit(null);
                  setFlatForm({ wing: "", number: "", address: "", areaSqft: "", bhk: "2BHK", isOccupied: true });
                  setFlatModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14B8A6] text-[#0B0F17] text-xs font-semibold hover:bg-[#0f9d6e] transition shadow-sm shadow-[#14B8A6]/30"
              >
                <Plus className="w-3 h-3" /> Add Flat
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {flatsList.length > 0 ? (
                flatsList.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono block">Flat {f.wing}-{f.number}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-slate-900 dark:text-white block font-bold">{f.bhk}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.area_sqft} sq.ft</span>
                      </div>
                      <button
                        onClick={() => {
                          setFlatEdit(f);
                          setFlatForm({
                            wing: f.wing,
                            number: f.number,
                            address: f.address || "",
                            areaSqft: String(f.area_sqft || ""),
                            bhk: f.bhk,
                            isOccupied: Boolean(f.is_occupied),
                          });
                          setFlatModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#14B8A6] dark:text-slate-400 dark:hover:text-[#14B8A6] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition" title="Edit flat"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget({ type: "flat", id: f.id, label: `Flat ${f.wing}-${f.number}` });
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#E11D48] dark:text-slate-400 dark:hover:text-[#E11D48] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition" title="Delete flat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">No flats found.</div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ================= User Modal ================= */}
      <AnimatePresence>
        {userModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setUserModalOpen(false);
                setUserEdit(null);
                setUserForm({ email: "", password: "", fullName: "", role: "RESIDENT", flatId: "" });
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)] transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {userEdit ? "Edit User" : "Add Society User"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {userEdit ? "Update officer / resident details" : "Register a new user account"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUserModalOpen(false);
                    setUserEdit(null);
                    setUserForm({ email: "", password: "", fullName: "", role: "RESIDENT", flatId: "" });
                  }}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="name@society.in"
                    disabled={Boolean(userEdit)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500"
                  />
                </div>
                {!userEdit && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Password</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="•••••••• (min 8 chars)"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Arun Prasad"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#F59E0B] transition"
                    >
                      <option value="RESIDENT">Resident</option>
                      <option value="COMMITTEE">Committee</option>
                      <option value="TREASURER">Treasurer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Flat ID</label>
                    <input
                      type="number"
                      value={userForm.flatId}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, flatId: e.target.value }))}
                      placeholder="Leave blank if unassigned"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserModalOpen(false);
                      setUserEdit(null);
                      setUserForm({ email: "", password: "", fullName: "", role: "RESIDENT", flatId: "" });
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={userSaving}
                    className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-[#0B0F17] font-semibold transition shadow-sm shadow-[#F59E0B]/20 text-sm"
                  >
                    {userSaving ? "Saving…" : userEdit ? "Update User" : "Create User"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= Flat Modal ================= */}
      <AnimatePresence>
        {flatModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setFlatModalOpen(false);
                setFlatEdit(null);
                setFlatForm({ wing: "", number: "", address: "", areaSqft: "", bhk: "2BHK", isOccupied: true });
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)] transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {flatEdit ? "Edit Flat" : "Add Society Unit"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {flatEdit ? "Update unit details" : "Register a new society flat"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFlatModalOpen(false);
                    setFlatEdit(null);
                    setFlatForm({ wing: "", number: "", address: "", areaSqft: "", bhk: "2BHK", isOccupied: true });
                  }}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleFlatSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Wing</label>
                    <input
                      type="text"
                      maxLength="2"
                      value={flatForm.wing}
                      onChange={(e) => setFlatForm((prev) => ({ ...prev, wing: e.target.value.toUpperCase() }))}
                      placeholder="A"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 uppercase focus:outline-none focus:border-[#F59E0B] transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Number</label>
                    <input
                      type="text"
                      maxLength="10"
                      value={flatForm.number}
                      onChange={(e) => setFlatForm((prev) => ({ ...prev, number: e.target.value }))}
                      placeholder="101"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Address</label>
                  <input
                    type="text"
                    value={flatForm.address}
                    onChange={(e) => setFlatForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Wing A, Vastu Heights, Baner, Pune"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Area (sq.ft)</label>
                    <input
                      type="number"
                      value={flatForm.areaSqft}
                      onChange={(e) => setFlatForm((prev) => ({ ...prev, areaSqft: e.target.value }))}
                      placeholder="1200"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">BHK</label>
                    <select
                      value={flatForm.bhk}
                      onChange={(e) => setFlatForm((prev) => ({ ...prev, bhk: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-input)] bg-[var(--bg-canvas)] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#F59E0B] transition"
                    >
                      <option value="1BHK">1BHK</option>
                      <option value="2BHK">2BHK</option>
                      <option value="3BHK">3BHK</option>
                    </select>
                  </div>
                  <div className="space-y-2 flex items-end">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Occupied</label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flatForm.isOccupied}
                        onChange={(e) => setFlatForm((prev) => ({ ...prev, isOccupied: e.target.checked }))}
                        className="rounded border-[var(--border-input)] text-[#F59E0B] bg-[var(--bg-canvas)] focus:ring-[#F59E0B]"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Yes</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFlatModalOpen(false);
                      setFlatEdit(null);
                      setFlatForm({ wing: "", number: "", address: "", areaSqft: "", bhk: "2BHK", isOccupied: true });
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={flatSaving}
                    className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-[#0B0F17] font-semibold transition shadow-sm shadow-[#F59E0B]/20 text-sm"
                  >
                    {flatSaving ? "Saving…" : flatEdit ? "Update Flat" : "Create Flat"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= Delete Confirm Modal ================= */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteModalOpen(false);
                setDeleteTarget(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)] transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Delete {deleteTarget?.type === "user" ? "User" : "Flat"}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to delete <strong>{deleteTarget?.label}</strong>? This cannot be undone.
                </p>
              </div>
              <div className="px-6 py-4 flex gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#B91C1C] disabled:opacity-50 text-white font-semibold transition shadow-sm shadow-[#E11D48]/30 text-sm"
                >
                  {deleteSaving ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ================= Audit Log Raw Event Detail Modal ================= */}
      <AnimatePresence>
        {selectedAuditLog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedAuditLog(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg glass-panel rounded-3xl p-6 space-y-4 border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-left shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#F59E0B] font-semibold">
                    Statutory Event #{selectedAuditLog.id}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {selectedAuditLog.action}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Operator</span>
                  <p className="font-semibold text-slate-900 dark:text-white truncate">
                    {selectedAuditLog.full_name || `User #${selectedAuditLog.user_id}`}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{selectedAuditLog.email}</p>
                </div>

                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Timestamp & Origin</span>
                  <p className="font-semibold text-slate-900 dark:text-white font-mono text-[11px]">
                    {formatDate(selectedAuditLog.occurred_at)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">IP: {selectedAuditLog.ip_address || "Internal"}</p>
                </div>
              </div>

              {selectedAuditLog.entity_type && (
                <div className="text-xs p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex justify-between font-mono">
                  <span className="text-slate-400">Entity Target:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {selectedAuditLog.entity_type} {selectedAuditLog.entity_id ? `(#${selectedAuditLog.entity_id})` : ""}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">Audit Payload JSON</label>
                <pre className="p-3 rounded-xl bg-black/40 text-[#14B8A6] font-mono text-xs overflow-x-auto max-h-48 border border-[var(--border-subtle)]">
                  {JSON.stringify(
                    typeof selectedAuditLog.details === "string"
                      ? JSON.parse(selectedAuditLog.details)
                      : selectedAuditLog.details || {},
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= Rotate Bank Master Modal ================= */}
      <AnimatePresence>
        {rotateBankModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setRotateBankModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)] transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      Rotate Society Bank Master & UPI
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Step-up authentication required • Updates payment QR & receipts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRotateBankModalOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleRotateBankSubmit} className="p-6 space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>High-Security Financial Control:</strong> Rotating the bank master updates the deposit destination for all flat maintenance collections and official receipts. All office bearers are notified.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Bank Ltd."
                      value={rotateBankForm.bankName}
                      onChange={(e) => setRotateBankForm({ ...rotateBankForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      RBI IFSC Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      placeholder="e.g. HDFC0001234"
                      value={rotateBankForm.ifscCode}
                      onChange={(e) =>
                        setRotateBankForm({
                          ...rotateBankForm,
                          ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New Account Number
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={18}
                      placeholder="9 to 18 digits"
                      value={rotateBankForm.accountNumber}
                      onChange={(e) =>
                        setRotateBankForm({
                          ...rotateBankForm,
                          accountNumber: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Account Number
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={18}
                      placeholder="Re-enter account number"
                      value={rotateBankForm.confirmAccountNumber}
                      onChange={(e) =>
                        setRotateBankForm({
                          ...rotateBankForm,
                          confirmAccountNumber: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New Society UPI VPA
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. vastuheights@hdfcbank"
                    value={rotateBankForm.upiVpa}
                    onChange={(e) => setRotateBankForm({ ...rotateBankForm, upiVpa: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Statutory Authority
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AGM 2026 Resolution #4 treasury bank migration"
                    value={rotateBankForm.reason}
                    onChange={(e) => setRotateBankForm({ ...rotateBankForm, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs"
                  />
                </div>

                {/* Step-up password */}
                <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                  <label className="block text-xs font-semibold text-purple-700 dark:text-purple-300">
                    Confirm Admin Password (Step-Up Authentication)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your admin account password"
                    value={rotateBankForm.adminPassword}
                    onChange={(e) => setRotateBankForm({ ...rotateBankForm, adminPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-purple-500/30 text-slate-900 dark:text-white text-xs font-mono"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                    <span>Derived Mask:</span>
                    <strong className="text-purple-600 dark:text-purple-400 font-semibold">
                      {rotateBankForm.bankName ? rotateBankForm.bankName : "Bank"} ••••{" "}
                      {rotateBankForm.accountNumber ? rotateBankForm.accountNumber.slice(-4) : "••••"}
                    </strong>
                  </div>
                </div>

                {rotateBankError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{rotateBankError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRotateBankModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rotateBankSaving}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 cursor-pointer"
                  >
                    {rotateBankSaving ? "Rotating Bank Master..." : "Verify & Rotate Bank"}
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

export default AdminControlPanelPage;