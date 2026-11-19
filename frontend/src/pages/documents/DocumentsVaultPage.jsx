import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  FolderLock,
  Upload,
  Plus,
  Download,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Pin,
  Trash2,
  Calendar,
  Building,
  CheckCircle2,
  X,
  FileCheck,
  Eye,
  Sparkles,
  ExternalLink,
  Flame,
  Award,
  Layers,
} from "lucide-react";
import * as documentService from "../../services/documentService.js";
import { formatDate } from "../../utils/formatCurrency.js";
import { generateOfficialNoticePDF } from "../../utils/noticePdfGenerator.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";

export default function DocumentsVaultPage() {
  const { user, hasRole } = useAuth();
  const { currentSociety, societyName, gstin } = useSocietyConfig();

  const [activeTab, setActiveTab] = useState("vault"); // 'vault' | 'notices'
  const [scorecard, setScorecard] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [docCategory, setDocCategory] = useState("ALL");
  const [docSearch, setDocSearch] = useState("");
  const [noticeSearch, setNoticeSearch] = useState("");

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "COMPLIANCE_NOC",
    documentNumber: "",
    issuingAuthority: "",
    accessScope: "ALL_RESIDENTS",
    validFrom: "",
    expiresAt: "",
    description: "",
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    noticeNumber: "",
    category: "GENERAL",
    priority: "MEDIUM",
    content: "",
    issuedBy: "Managing Committee",
    isPinned: false,
    attachment: null,
  });
  const [publishing, setPublishing] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      const [scorecardData, docsData, noticesData] = await Promise.all([
        documentService.getComplianceScorecard(),
        documentService.listDocuments(),
        documentService.listNotices(),
      ]);
      setScorecard(scorecardData);
      setDocuments(docsData || []);
      setNotices(noticesData || []);
    } catch (err) {
      console.error("Failed to load documents vault data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.title) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", uploadForm.title);
      formData.append("category", uploadForm.category);
      if (uploadForm.documentNumber) formData.append("documentNumber", uploadForm.documentNumber);
      if (uploadForm.issuingAuthority) formData.append("issuingAuthority", uploadForm.issuingAuthority);
      formData.append("accessScope", uploadForm.accessScope);
      if (uploadForm.validFrom) formData.append("validFrom", uploadForm.validFrom);
      if (uploadForm.expiresAt) formData.append("expiresAt", uploadForm.expiresAt);
      if (uploadForm.description) formData.append("description", uploadForm.description);
      if (uploadForm.file) formData.append("file", uploadForm.file);

      const res = await documentService.uploadDocument(formData);
      showToast(res.message || "Document uploaded successfully!");
      setUploadModalOpen(false);
      setUploadForm({
        title: "",
        category: "COMPLIANCE_NOC",
        documentNumber: "",
        issuingAuthority: "",
        accessScope: "ALL_RESIDENTS",
        validFrom: "",
        expiresAt: "",
        description: "",
        file: null,
      });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to upload document", true);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove '${title}' from the vault?`)) return;
    try {
      await documentService.deleteDocument(id);
      showToast("Document removed from vault");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to delete document", true);
    }
  };

  const handleNoticeSubmit = async (e) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.content) return;

    setPublishing(true);
    try {
      const formData = new FormData();
      formData.append("title", noticeForm.title);
      if (noticeForm.noticeNumber) formData.append("noticeNumber", noticeForm.noticeNumber);
      formData.append("category", noticeForm.category);
      formData.append("priority", noticeForm.priority);
      formData.append("content", noticeForm.content);
      formData.append("issuedBy", noticeForm.issuedBy);
      formData.append("isPinned", String(Boolean(noticeForm.isPinned)));
      if (noticeForm.attachment) formData.append("attachment", noticeForm.attachment);

      const res = await documentService.createNotice(formData);
      showToast(res.message || "Official notice published!");
      setNoticeModalOpen(false);
      setNoticeForm({
        title: "",
        noticeNumber: "",
        category: "GENERAL",
        priority: "MEDIUM",
        content: "",
        issuedBy: "Managing Committee",
        isPinned: false,
        attachment: null,
      });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to publish notice", true);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteNotice = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete notice '${title}'?`)) return;
    try {
      await documentService.deleteNotice(id);
      showToast("Notice removed from notice board");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to delete notice", true);
    }
  };

  const handleDownloadNoticePdf = (notice) => {
    generateOfficialNoticePDF({
      society: {
        NAME: societyName,
        REG_NO: currentSociety?.registration_number,
        ADDRESS: currentSociety?.address,
      },
      notice,
    });
  };

  // Filtered documents
  const filteredDocs = documents.filter((d) => {
    const matchesCat = docCategory === "ALL" || d.category === docCategory;
    const q = docSearch.toLowerCase();
    const matchesSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.document_number?.toLowerCase().includes(q) ||
      d.issuing_authority?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Filtered notices
  const filteredNotices = notices.filter((n) => {
    const q = noticeSearch.toLowerCase();
    return (
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.notice_number.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.issued_by.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-medium backdrop-blur-md ${
              toastMessage.isError
                ? "bg-rose-500/90 text-white border-rose-600 shadow-rose-500/20"
                : "bg-emerald-600/90 text-white border-emerald-500 shadow-emerald-500/20"
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-xl relative overflow-hidden">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6]">
              <FolderLock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Official PDF Notice Board & Society Documents Vault
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#14B8A6]/15 text-[#14B8A6] border border-[#14B8A6]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Statutory Archive
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official certificates repository (Fire NOC, Lift Safety, Model Bye-laws) & digitally stamped letterhead circulars.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {hasRole("ADMIN", "TREASURER", "COMMITTEE") && (
            <>
              <button
                onClick={() => setNoticeModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#F59E0B]" />
                Publish Notice
              </button>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-semibold transition text-xs flex items-center gap-1.5 shadow-lg shadow-[#14B8A6]/20"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            </>
          )}
        </div>
      </div>

      {/* Statutory Compliance Health Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fire Safety NOC */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-500" /> Fire Safety NOC
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                scorecard?.fireNoc?.status === "ACTIVE"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/15 text-rose-600"
              }`}
            >
              {scorecard?.fireNoc?.status || "ACTIVE"}
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 font-mono font-medium truncate">
            {scorecard?.fireNoc?.documentNumber || "PMC/FIRE/NOC/2026/0442"}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-500" />
            <span>
              {scorecard?.fireNoc?.daysLeft !== null && scorecard?.fireNoc?.daysLeft > 0
                ? `Valid for ${scorecard.fireNoc.daysLeft} days`
                : "Active annual certification"}
            </span>
          </div>
        </div>

        {/* Lift Inspection License */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> Lift Safety License
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                scorecard?.liftLicense?.status === "ACTIVE"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600"
              }`}
            >
              {scorecard?.liftLicense?.status || "ACTIVE"}
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 font-mono font-medium truncate">
            {scorecard?.liftLicense?.documentNumber || "CEI/MH/LIFT/8821"}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-500" />
            <span>
              {scorecard?.liftLicense?.daysLeft !== null && scorecard?.liftLicense?.daysLeft > 0
                ? `Valid for ${scorecard.liftLicense.daysLeft} days`
                : "ARD system verified"}
            </span>
          </div>
        </div>

        {/* Model Society Bye-Laws */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#14B8A6]" /> Model Bye-Laws
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              ADOPTED
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 font-mono font-medium truncate">
            174 Statutory Clauses (2014)
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#14B8A6]" />
            <span>Maharashtra Co-op Act</span>
          </div>
        </div>

        {/* Statutory Audit */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-500" /> Statutory Audit
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              AUDITED
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 font-mono font-medium truncate">
            FY 2024-25 CA Certified
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
            <span>Sinking Fund Compliant</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-2 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("vault")}
          className={`flex items-center gap-2 pb-2 px-1 transition relative ${
            activeTab === "vault"
              ? "text-[#14B8A6]"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>Statutory Documents Vault ({documents.length})</span>
          {activeTab === "vault" && (
            <motion.div
              layoutId="docTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6] rounded-full"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab("notices")}
          className={`flex items-center gap-2 pb-2 px-1 transition relative ${
            activeTab === "notices"
              ? "text-[#14B8A6]"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Official Digital Notice Board ({notices.length})</span>
          {activeTab === "notices" && (
            <motion.div
              layoutId="docTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6] rounded-full"
            />
          )}
        </button>
      </div>

      {/* TAB 1: Documents Vault */}
      {activeTab === "vault" && (
        <div className="space-y-4">
          {/* Controls: Search & Category Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)]">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "ALL", label: "All Docs" },
                { key: "COMPLIANCE_NOC", label: "Fire & Safety NOC" },
                { key: "SOCIETY_BYELAWS", label: "Bye-Laws" },
                { key: "FINANCIAL_AUDIT", label: "Audits" },
                { key: "AGM_MINUTES", label: "AGM Minutes" },
                { key: "SHARE_CERTIFICATE", label: "Share Certs" },
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => setDocCategory(c.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    docCategory === c.key
                      ? "bg-[#14B8A6] text-white font-bold shadow-sm"
                      : "bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search certificate title, doc #..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#14B8A6] w-64"
              />
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                No documents found matching the filter.
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-md hover:shadow-xl transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400">
                        {doc.category?.replace("_", " ")}
                      </span>

                      {doc.access_scope === "COMMITTEE_ONLY" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <FolderLock className="w-3 h-3" /> Confidential
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                      {doc.title}
                    </h3>

                    {doc.document_number && (
                      <div className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] truncate">
                        Doc: {doc.document_number}
                      </div>
                    )}

                    {doc.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-[var(--border-subtle)]/50">
                      {doc.issuing_authority && (
                        <div className="truncate">Authority: {doc.issuing_authority}</div>
                      )}
                      {doc.expires_at && (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>Valid until {formatDate(doc.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {doc.file_size_bytes ? `${Math.round(doc.file_size_bytes / 1024)} KB` : "PDF"}
                    </span>

                    <div className="flex items-center gap-2">
                      {hasRole("ADMIN", "TREASURER") && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                          title="Delete from vault"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={doc.file_path || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-semibold transition text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Official Digital Notice Board */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Showing official managing committee notices and circulars
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={noticeSearch}
                onChange={(e) => setNoticeSearch(e.target.value)}
                placeholder="Search circular title, text..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#14B8A6] w-64"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredNotices.length === 0 ? (
              <div className="py-12 text-center text-slate-400">No notices posted.</div>
            ) : (
              filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-6 rounded-3xl bg-[var(--bg-card)] border transition shadow-md hover:shadow-xl space-y-4 ${
                    notice.is_pinned
                      ? "border-amber-500/40 bg-gradient-to-r from-amber-500/5 to-transparent"
                      : "border-[var(--border-glass)]"
                  }`}
                >
                  {/* Top Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center gap-2">
                      {notice.is_pinned && (
                        <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500" title="Pinned Notice">
                          <Pin className="w-4 h-4 fill-amber-500" />
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-slate-800 dark:text-slate-200">
                        {notice.notice_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          notice.priority === "EMERGENCY"
                            ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            : notice.priority === "HIGH"
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {notice.priority}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {notice.category?.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(notice.published_at)}</span>
                    </div>
                  </div>

                  {/* Notice Title & Content */}
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {notice.title}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {notice.content}
                    </p>
                  </div>

                  {/* Signatory Footer & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
                    <div className="text-slate-500">
                      Issued by: <span className="font-semibold text-slate-700 dark:text-slate-300">{notice.issued_by}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {hasRole("ADMIN", "TREASURER") && (
                        <button
                          onClick={() => handleDeleteNotice(notice.id, notice.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                          title="Delete notice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadNoticePdf(notice)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-semibold transition text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF Circular
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Upload Document */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#14B8A6]/15 text-[#14B8A6]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Upload Society Document / Compliance Certificate
                    </h3>
                    <p className="text-xs text-slate-500">
                      Files are securely stored and indexed for statutory compliance and bank loan audits.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g. Fire Safety NOC 2026-27"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    >
                      <option value="COMPLIANCE_NOC">Fire & Safety NOC</option>
                      <option value="SOCIETY_BYELAWS">Model Society Bye-Laws</option>
                      <option value="AGM_MINUTES">AGM Minutes & Resolutions</option>
                      <option value="FINANCIAL_AUDIT">Statutory Financial Audit</option>
                      <option value="SHARE_CERTIFICATE">Share Certificate Archive</option>
                      <option value="GENERAL">General Society Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Access Scope
                    </label>
                    <select
                      value={uploadForm.accessScope}
                      onChange={(e) => setUploadForm({ ...uploadForm, accessScope: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    >
                      <option value="ALL_RESIDENTS">All Residents (Portal Visible)</option>
                      <option value="COMMITTEE_ONLY">Committee Only (Confidential)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document / Certificate #
                    </label>
                    <input
                      type="text"
                      value={uploadForm.documentNumber}
                      onChange={(e) => setUploadForm({ ...uploadForm, documentNumber: e.target.value })}
                      placeholder="e.g. PMC/FIRE/2026/0442"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Issuing Authority
                    </label>
                    <input
                      type="text"
                      value={uploadForm.issuingAuthority}
                      onChange={(e) => setUploadForm({ ...uploadForm, issuingAuthority: e.target.value })}
                      placeholder="e.g. Municipal Fire Brigade"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Valid From
                    </label>
                    <input
                      type="date"
                      value={uploadForm.validFrom}
                      onChange={(e) => setUploadForm({ ...uploadForm, validFrom: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expires At (For Expiry Alerts)
                    </label>
                    <input
                      type="date"
                      value={uploadForm.expiresAt}
                      onChange={(e) => setUploadForm({ ...uploadForm, expiresAt: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Upload PDF / Image File
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#14B8A6]/20 file:text-[#14B8A6]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold"
                  >
                    {uploading ? "Uploading..." : "Save to Vault"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Publish Notice */}
      <AnimatePresence>
        {noticeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden text-[var(--text-primary)]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Publish Official Circular / Notice
                    </h3>
                    <p className="text-xs text-slate-500">
                      Will be published to the digital notice board with instant downloadable PDF letterheads.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setNoticeModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleNoticeSubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notice Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    placeholder="e.g. Annual General Meeting (AGM) Notice & Agenda"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={noticeForm.category}
                      onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    >
                      <option value="AGM_EGM">AGM / EGM Meeting</option>
                      <option value="MAINTENANCE_WORK">Maintenance & Shutdown</option>
                      <option value="RULES_REGULATIONS">Rules & Byelaws Compliance</option>
                      <option value="ELECTION">Managing Committee Election</option>
                      <option value="EVENT_CELEBRATION">Community Event</option>
                      <option value="GENERAL">General Announcement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={noticeForm.priority}
                      onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium / Standard</option>
                      <option value="HIGH">High Priority</option>
                      <option value="EMERGENCY">Emergency Notice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notice Content & Instructions *
                  </label>
                  <textarea
                    required
                    rows="5"
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                    placeholder="Enter formal notice details, dates, timings, and resolution items..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Issued By
                    </label>
                    <input
                      type="text"
                      value={noticeForm.issuedBy}
                      onChange={(e) => setNoticeForm({ ...noticeForm, issuedBy: e.target.value })}
                      placeholder="Managing Committee"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white focus:outline-none focus:border-[#14B8A6]"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noticeForm.isPinned}
                        onChange={(e) => setNoticeForm({ ...noticeForm, isPinned: e.target.checked })}
                        className="rounded border-[var(--border-input)] text-[#14B8A6] focus:ring-0"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Pin to Top of Notice Board
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setNoticeModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-bold"
                  >
                    {publishing ? "Publishing..." : "Publish Circular"}
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
