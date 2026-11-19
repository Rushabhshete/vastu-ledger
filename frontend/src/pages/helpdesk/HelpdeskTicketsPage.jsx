import React, { useState, useEffect } from "react";
import {
  Wrench,
  Zap,
  Droplets,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  ArrowUpDown,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Star,
  User,
  Phone,
  DollarSign,
  Camera,
  X,
  Send,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import GlassCard from "../../components/ui/GlassCard.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { formatINR, formatDate } from "../../utils/formatCurrency.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as ticketService from "../../services/ticketService.js";

const CATEGORIES = [
  { id: "PLUMBING", label: "Plumbing", icon: Wrench, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { id: "ELECTRICAL", label: "Electrical", icon: Zap, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { id: "CIVIL_LEAKAGE", label: "Seepage & Leakage", icon: Droplets, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { id: "LIFT_ELEVATOR", label: "Lift & Elevator", icon: ArrowUpDown, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { id: "SECURITY", label: "Security & Gates", icon: ShieldAlert, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { id: "HOUSEKEEPING", label: "Housekeeping", icon: Sparkles, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { id: "GENERAL", label: "General & Amenities", icon: HelpCircle, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
];

export function HelpdeskTicketsPage() {
  const { user, hasRole } = useAuth();
  const { currentSocietyId, currentSociety, societyName } = useSocietyConfig();

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open_count: 0, in_progress_count: 0, resolved_count: 0, closed_count: 0, emergency_count: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState(user?.role === "RESIDENT" ? "my" : "all");
  const [search, setSearch] = useState("");

  // Modals & Selection
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketComments, setTicketComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    category: "PLUMBING",
    priority: "MEDIUM",
    scopeType: "PRIVATE_FLAT",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  // Edit / Progress update state
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editResolutionNotes, setEditResolutionNotes] = useState("");
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Rating state
  const [ratingStars, setRatingStars] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [closingTicket, setClosingTicket] = useState(false);

  const canManage = hasRole("ADMIN", "TREASURER", "COMMITTEE") || Boolean(user?.isSuperadmin);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ticketService.listTickets({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        search: search || undefined,
        filterMode: scopeFilter,
      });
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      if (data.stats) setStats(data.stats);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentSocietyId, statusFilter, categoryFilter, priorityFilter, scopeFilter, search]);

  const handleOpenDetail = async (ticket) => {
    setSelectedTicket(ticket);
    setEditAssignedTo(ticket.assigned_to || "");
    setEditCost(ticket.estimated_cost ? String(ticket.estimated_cost) : "");
    setEditResolutionNotes(ticket.resolution_notes || "");
    setDetailModalOpen(true);
    try {
      const details = await ticketService.getTicketDetails(ticket.id);
      setSelectedTicket(details.ticket);
      setTicketComments(details.comments || []);
    } catch {
      // Keep selected
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await ticketService.createTicket(createForm, photoFile);
      setActionMessage(`Ticket #${res.id} submitted successfully! The committee has been notified.`);
      setCreateModalOpen(false);
      setCreateForm({
        title: "",
        description: "",
        category: "PLUMBING",
        priority: "MEDIUM",
        scopeType: "PRIVATE_FLAT",
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;
    setSubmittingComment(true);
    try {
      await ticketService.addComment(selectedTicket.id, {
        comment: newComment.trim(),
        isInternal: isInternalComment,
      });
      setNewComment("");
      // Refresh comments
      const details = await ticketService.getTicketDetails(selectedTicket.id);
      setTicketComments(details.comments || []);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateProgress = async (newStatus) => {
    if (!selectedTicket) return;
    setUpdatingProgress(true);
    try {
      const payload = {
        status: newStatus,
        assignedTo: editAssignedTo.trim() || null,
        estimatedCost: editCost ? Number(editCost) : 0,
        resolutionNotes: editResolutionNotes.trim() || null,
      };
      const updated = await ticketService.updateTicketProgress(selectedTicket.id, payload);
      setSelectedTicket(updated);
      setActionMessage(`Ticket #${selectedTicket.id} updated to ${newStatus}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Update failed");
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleCloseAndRate = async () => {
    if (!selectedTicket) return;
    setClosingTicket(true);
    try {
      const updated = await ticketService.closeAndRateTicket(selectedTicket.id, {
        rating: ratingStars,
        feedback: feedbackText.trim() || null,
      });
      setSelectedTicket(updated);
      setActionMessage(`Ticket #${selectedTicket.id} closed with ${ratingStars}-star feedback ✓`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to close ticket");
    } finally {
      setClosingTicket(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
              Resident Helpdesk & Maintenance
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
              Live Ticketing OS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Report flat issues, track lift/plumbing repairs, assign vendors, and record resident ratings for {societyName}.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Raise Maintenance Ticket
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage("")} className="text-slate-800 dark:text-white hover:underline text-[11px] font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20">
          <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Total Tickets</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {stats.total || 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-red-500 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" /> Emergency
          </div>
          <div className="text-xl font-bold font-mono text-red-500 mt-1">
            {stats.emergency_count || 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="text-[10px] font-mono uppercase text-amber-500 font-bold">Open / Pending</div>
          <div className="text-xl font-bold font-mono text-amber-500 mt-1">
            {stats.open_count || 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="text-[10px] font-mono uppercase text-blue-500 font-bold">In Progress</div>
          <div className="text-xl font-bold font-mono text-blue-500 mt-1">
            {stats.in_progress_count || 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/30">
          <div className="text-[10px] font-mono uppercase text-[#14B8A6] font-bold">Resolved / Closed</div>
          <div className="text-xl font-bold font-mono text-[#14B8A6] mt-1">
            {(Number(stats.resolved_count) || 0) + (Number(stats.closed_count) || 0)}
          </div>
        </div>
      </div>

      {/* Scope & Role Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setScopeFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                scopeFilter === "all"
                  ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Society Tickets
            </button>
          )}

          {user?.flatId && (
            <button
              onClick={() => setScopeFilter("my")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                scopeFilter === "my"
                  ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              My Flat Tickets
            </button>
          )}

          <button
            onClick={() => setScopeFilter("community")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              scopeFilter === "community"
                ? "bg-black/10 dark:bg-white/10 text-[#F59E0B] border border-[var(--border-subtle)] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Common Area Issues
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, flats, vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#F59E0B]"
          />
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition ${
              statusFilter === st
                ? "bg-[#F59E0B] text-[#0B0F17] font-bold shadow-sm"
                : "bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10"
            }`}
          >
            {st === "ALL" ? "All Statuses" : st.replace("_", " ")}
          </button>
        ))}

        <div className="h-4 w-[1px] bg-slate-300 dark:bg-white/10 mx-1 hidden sm:block" />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-xs text-slate-700 dark:text-slate-300"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs font-mono text-slate-500">
          Loading helpdesk tickets...
        </div>
      ) : tickets.length === 0 ? (
        <GlassCard className="py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-[#14B8A6]" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No Maintenance Tickets Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {statusFilter !== "ALL"
              ? `There are no tickets currently marked as ${statusFilter}.`
              : "All systems in the society are currently operating smoothly."}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((t) => {
            const catMeta = CATEGORIES.find((c) => c.id === t.category) || CATEGORIES[6];
            const IconComp = catMeta.icon;
            const isEmergency = t.priority === "EMERGENCY" && t.status !== "CLOSED";

            return (
              <GlassCard
                key={t.id}
                onClick={() => handleOpenDetail(t)}
                className={`p-4 space-y-3 cursor-pointer hover:border-[#F59E0B]/50 transition relative group ${
                  isEmergency ? "border-red-500/40 bg-red-500/[0.02]" : ""
                }`}
              >
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`p-1.5 rounded-lg border text-xs ${catMeta.color}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                      {catMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {t.priority === "EMERGENCY" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500 text-white animate-pulse">
                        EMERGENCY
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        t.status === "OPEN"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : t.status === "IN_PROGRESS"
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : t.status === "RESOLVED"
                          ? "bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Title & Desc */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#F59E0B] transition">
                    #{t.id} • {t.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {t.description}
                  </p>
                </div>

                {/* Photo Preview Thumbnail if present */}
                {t.photo_url && (
                  <div className="h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-black/10">
                    <img src={t.photo_url} alt="Proof" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Assigned Vendor / Estimated Cost if set */}
                {t.assigned_to && (
                  <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]">{t.assigned_to}</span>
                    </div>
                    {Number(t.estimated_cost) > 0 && (
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatINR(t.estimated_cost)}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer Info */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>
                    {t.scope_type === "COMMON_AREA"
                      ? "Common Area"
                      : t.flat_number
                      ? `Flat ${t.wing || ""}-${t.flat_number}`
                      : "Private Flat"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {t.comments_count || 0}
                    </span>
                    <span>{formatDate(t.created_at)}</span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Create Ticket Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Raise Maintenance Ticket
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Issue Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master bathroom tap leaking continuously"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-slate-900 dark:text-white focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-slate-900 dark:text-white focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Priority *
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="LOW">Low (Routine)</option>
                    <option value="MEDIUM">Medium (Normal)</option>
                    <option value="HIGH">High (Urgent)</option>
                    <option value="EMERGENCY">🚨 Emergency (Immediate Hazard)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Scope Type
                  </label>
                  <select
                    value={createForm.scopeType}
                    onChange={(e) => setCreateForm({ ...createForm, scopeType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="PRIVATE_FLAT">My Private Flat</option>
                    <option value="COMMON_AREA">Common Society Area (Corridor/Lift/Gym)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the exact location, symptoms, when it started, and any immediate precautions taken..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-slate-900 dark:text-white focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {/* Photo Proof Upload */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Attach Photo / Proof (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-white/20 hover:border-[#F59E0B] text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer transition">
                    <Camera className="w-4 h-4 text-[#F59E0B]" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </label>
                  {photoPreview && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-white/20">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                        className="absolute top-0 right-0 p-0.5 bg-black/70 text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-[#0B0F17] font-bold shadow-md shadow-[#F59E0B]/20"
                >
                  {creating ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Drawer / Modal */}
      {detailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-500">#{selectedTicket.id}</span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedTicket.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      selectedTicket.status === "OPEN"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : selectedTicket.status === "IN_PROGRESS"
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : selectedTicket.status === "RESOLVED"
                        ? "bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {selectedTicket.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {selectedTicket.scope_type === "COMMON_AREA"
                    ? "Common Area"
                    : `Flat ${selectedTicket.wing || ""}-${selectedTicket.flat_number || ""}`}{" "}
                  • Logged by {selectedTicket.creator_name || "Resident"} on {formatDate(selectedTicket.created_at)}
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Description */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Resident Description
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedTicket.description}
                </p>
                {selectedTicket.photo_url && (
                  <div className="pt-2">
                    <a
                      href={selectedTicket.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#F59E0B] font-semibold hover:underline"
                    >
                      <Camera className="w-3.5 h-3.5" /> View Uploaded Photo Proof
                    </a>
                  </div>
                )}
              </div>

              {/* Committee Workflow & Vendor Assignment Controls */}
              {canManage && selectedTicket.status !== "CLOSED" && (
                <div className="p-4 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-[#F59E0B]" /> Management & Vendor Assignment
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Assigned Technician / Vendor
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Sharma (Plumber 9820123456)"
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/20 border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Estimated Cost (₹ INR)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={editCost}
                        onChange={(e) => setEditCost(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/20 border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Resolution Notes (Technician report)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Work carried out, parts replaced, or inspection verdict..."
                      value={editResolutionNotes}
                      onChange={(e) => setEditResolutionNotes(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/20 border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {selectedTicket.status === "OPEN" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateProgress("IN_PROGRESS")}
                        disabled={updatingProgress}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                      >
                        Assign & Mark In Progress
                      </button>
                    )}

                    {selectedTicket.status !== "RESOLVED" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateProgress("RESOLVED")}
                        disabled={updatingProgress}
                        className="px-3.5 py-1.5 rounded-lg bg-[#14B8A6] text-white font-semibold hover:bg-[#0D9488] transition"
                      >
                        Save & Mark Resolved
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUpdateProgress(selectedTicket.status)}
                      disabled={updatingProgress}
                      className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Save Details
                    </button>
                  </div>
                </div>
              )}

              {/* Resolution Verdict Banner */}
              {selectedTicket.status === "RESOLVED" && (
                <div className="p-4 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#14B8A6] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Issue Marked Resolved
                    </span>
                    <span className="font-mono text-slate-400">
                      Resolved {formatDate(selectedTicket.resolved_at)}
                    </span>
                  </div>
                  {selectedTicket.resolution_notes && (
                    <p className="text-slate-800 dark:text-slate-200">
                      <strong>Resolution Notes:</strong> {selectedTicket.resolution_notes}
                    </p>
                  )}

                  {/* Resident Rating Card (if resident or admin) */}
                  <div className="pt-3 border-t border-[#14B8A6]/20 space-y-2">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      Resident Satisfaction Rating & Closure
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingStars(star)}
                          className="p-1 hover:scale-110 transition"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= ratingStars
                                ? "text-[#F59E0B] fill-[#F59E0B]"
                                : "text-slate-300 dark:text-white/20"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {ratingStars} / 5 Stars
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Add brief satisfaction feedback (e.g. prompt service, thank you!)..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={handleCloseAndRate}
                      disabled={closingTicket}
                      className="px-4 py-2 rounded-lg bg-[#14B8A6] text-white font-bold hover:bg-[#0D9488] transition shadow-md shadow-[#14B8A6]/20"
                    >
                      {closingTicket ? "Closing..." : "Accept Resolution & Close Ticket"}
                    </button>
                  </div>
                </div>
              )}

              {/* Closed Verdict */}
              {selectedTicket.status === "CLOSED" && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Ticket Closed</span>
                    {selectedTicket.rating && (
                      <div className="flex items-center gap-1">
                        {[...Array(selectedTicket.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTicket.feedback && (
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      "{selectedTicket.feedback}"
                    </p>
                  )}
                </div>
              )}

              {/* Comment Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-slate-400" /> Progress Timeline & Communication ({ticketComments.length})
                </h4>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {ticketComments.length === 0 ? (
                    <p className="text-slate-400 italic">No comments yet.</p>
                  ) : (
                    ticketComments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          c.is_internal
                            ? "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200"
                            : "bg-black/5 dark:bg-white/5 border-[var(--border-subtle)] text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.full_name} ({c.role})
                            {c.is_internal && " • Internal Management Note"}
                          </span>
                          <span className="text-slate-400">{formatDate(c.created_at)}</span>
                        </div>
                        <p>{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                {selectedTicket.status !== "CLOSED" && (
                  <form onSubmit={handleAddComment} className="pt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Write an update, question, or technician note..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#F59E0B]"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="p-2 rounded-xl bg-[#F59E0B] text-[#0B0F17] disabled:opacity-50 transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    {canManage && (
                      <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalComment}
                          onChange={(e) => setIsInternalComment(e.target.checked)}
                          className="rounded text-[#F59E0B]"
                        />
                        <span>Internal Committee Note (hidden from resident)</span>
                      </label>
                    )}
                  </form>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default HelpdeskTicketsPage;
