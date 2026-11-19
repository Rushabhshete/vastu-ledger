import React, { useState, useEffect } from "react";
import {
  Vote,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  Check,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileDown,
} from "lucide-react";
import GlassCard from "../../components/ui/GlassCard.jsx";
import { formatDate } from "../../utils/formatCurrency.js";
import { generateAgmFinancialPackPDF } from "../../utils/pdfExporter.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as governanceService from "../../services/governanceService.js";

export function AgmPollsPage() {
  const { user, hasRole } = useAuth();
  const { currentSocietyId, societyName } = useSocietyConfig();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [exportingAgm, setExportingAgm] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [expandedPollAudit, setExpandedPollAudit] = useState(null);

  const handleExportAgmPackage = async () => {
    setExportingAgm(true);
    try {
      const agmPackage = await governanceService.getAgmPackage();
      generateAgmFinancialPackPDF({ agmPackage });
      setActionMsg("Statutory AGM Financial Pack downloaded successfully.");
    } catch (err) {
      alert("Failed to export Statutory AGM Financial Pack: " + (err.response?.data?.message || err.message));
    } finally {
      setExportingAgm(false);
    }
  };

  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: "YES, NO, ABSTAIN",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const loadPolls = async () => {
    setLoading(true);
    try {
      const data = await governanceService.listPolls();
      setPolls(Array.isArray(data) ? data : []);
    } catch {
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPolls([]);
    loadPolls();
  }, [currentSocietyId]);

  const handleCastVote = async (pollId, choice) => {
    if (!user?.flatId && user?.role === "RESIDENT") {
      alert("Only registered flat owners can cast official AGM votes.");
      return;
    }

    setSubmittingVote(true);
    try {
      await governanceService.castVote(pollId, choice);
      setActionMsg(`Your ballot '${choice}' has been securely cast and anchored for Resolution #${pollId} ✓`);
      loadPolls();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to record vote");
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    try {
      const parsedOptions =
        typeof newPoll.options === "string"
          ? newPoll.options.split(",").map((s) => s.trim()).filter(Boolean)
          : newPoll.options;

      await governanceService.createPoll({
        ...newPoll,
        options: parsedOptions.length >= 2 ? parsedOptions : ["YES", "NO", "ABSTAIN"],
      });
      setActionMsg("New AGM resolution published for democratic voting ✓");
      setCreateModalOpen(false);
      loadPolls();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to publish poll");
    }
  };

  const renderStatusBadge = (poll) => {
    if (poll.status === "ACTIVE") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Ballot
        </span>
      );
    }
    if (poll.status === "UPCOMING") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Upcoming
        </span>
      );
    }
    // CLOSED
    if (poll.outcome === "PASSED") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          Passed & Binding
        </span>
      );
    }
    if (poll.outcome === "REJECTED") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        Inconclusive (No Quorum)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Vote className="w-6 h-6 text-[#F59E0B]" />
            <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
              Digital AGM Governance & Polls
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Democratic 1-Flat-1-Vote electronic ballot box anchored for {societyName}. Statutory quorum: 60% of units.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAgmPackage}
            disabled={exportingAgm}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-2 transition border border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-50"
            title="Download Official Statutory AGM Financial & Governance Pack (PDF)"
          >
            <FileDown className="w-4 h-4 text-[#14B8A6]" />
            {exportingAgm ? "Compiling AGM Pack..." : "Export Statutory AGM Pack (PDF)"}
          </button>

          {hasRole("ADMIN", "COMMITTEE") && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Publish Resolution
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] text-xs flex items-center justify-between">
          <span>{actionMsg}</span>
          <button
            onClick={() => setActionMsg("")}
            className="text-slate-800 dark:text-white hover:underline text-[11px] font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Polls Grid */}
      {loading && polls.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading AGM resolutions...</div>
      ) : polls.length === 0 ? (
        <GlassCard className="py-12 text-center text-slate-400">
          <Vote className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No resolutions published yet for this society.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {polls.map((poll) => {
            const isVotingActive = poll.status === "ACTIVE";
            const opts = Array.isArray(poll.options) ? poll.options : ["YES", "NO", "ABSTAIN"];
            const isAuditExpanded = expandedPollAudit === poll.id;

            return (
              <GlassCard key={poll.id} className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#F59E0B] uppercase bg-[#F59E0B]/10 px-2 py-0.5 rounded-md border border-[#F59E0B]/20">
                      Resolution #{poll.id}
                    </span>
                    {renderStatusBadge(poll)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{poll.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                      {poll.description}
                    </p>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
                    <span>Window: {formatDate(poll.start_date)} — {formatDate(poll.end_date)}</span>
                    <span className="text-[#14B8A6]">1-Flat-1-Vote</span>
                  </div>

                  {/* Quorum Metric Progress */}
                  <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#F59E0B]" /> Turnout: {poll.totalVotes} / {poll.totalFlats} Units ({poll.turnoutPct}%)
                      </span>
                      {poll.quorumMet ? (
                        <span className="text-emerald-500 font-bold font-mono text-[11px]">
                          ✓ Quorum Met ({poll.quorumPct}%)
                        </span>
                      ) : (
                        <span className="text-amber-500 font-mono text-[11px]">
                          Need {Math.max(0, poll.quorumRequired - poll.totalVotes)} more for quorum
                        </span>
                      )}
                    </div>

                    {/* Progress Bar with 60% Marker */}
                    <div className="relative w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          poll.quorumMet ? "bg-emerald-500" : "bg-[#F59E0B]"
                        }`}
                        style={{ width: `${Math.min(100, poll.turnoutPct)}%` }}
                      />
                      {/* Milestone Line at 60% */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                        style={{ left: `${poll.quorumPct}%` }}
                        title="60% Statutory Quorum Threshold"
                      />
                    </div>
                  </div>

                  {/* Democratic Tally Breakdown Progress Bars */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block font-mono">
                      Democratic Vote Tally ({poll.totalVotes} total votes):
                    </span>
                    <div className="space-y-1.5">
                      {opts.map((opt) => {
                        const count = poll.tally ? poll.tally[opt] || 0 : 0;
                        const pct = poll.percentages ? poll.percentages[opt] || 0 : 0;
                        const isUserChoice = poll.userVote === opt;

                        const barColor =
                          opt === "YES"
                            ? "bg-emerald-500"
                            : opt === "NO"
                            ? "bg-rose-500"
                            : "bg-slate-400";

                        return (
                          <div key={opt} className="space-y-0.5">
                            <div className="flex justify-between items-center text-[11px] font-mono">
                              <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                {opt}
                                {isUserChoice && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-500 font-bold border border-emerald-500/30">
                                    Your Vote
                                  </span>
                                )}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {count} votes ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Voting Ballot Box / Status Section */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                  {poll.hasVoted ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Check className="w-4 h-4" />
                        <span>Ballot Cast: <strong>{poll.userVote}</strong></span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {poll.userVotedAt ? formatDate(poll.userVotedAt) : "Recorded"}
                      </span>
                    </div>
                  ) : isVotingActive ? (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-2 font-mono">
                        Cast Your Official Flat Ballot:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {opts.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleCastVote(poll.id, opt)}
                            disabled={submittingVote}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold font-mono transition text-center shadow-sm cursor-pointer disabled:opacity-50 ${
                              opt === "YES"
                                ? "bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : opt === "NO"
                                ? "bg-rose-500/10 hover:bg-rose-500 hover:text-white border-rose-500/30 text-rose-600 dark:text-rose-400"
                                : "bg-black/5 dark:bg-white/5 hover:bg-slate-500 hover:text-white border-[var(--border-subtle)] text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-center text-xs text-slate-400 font-mono">
                      Voting window is closed for this resolution.
                    </div>
                  )}

                  {/* Flat Audit Roll Accordion */}
                  {Array.isArray(poll.votes) && poll.votes.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() =>
                          setExpandedPollAudit(isAuditExpanded ? null : poll.id)
                        }
                        className="w-full text-left text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-between py-1 cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" />
                          Inspect Flat Turnout Audit ({poll.votes.length} flats)
                        </span>
                        {isAuditExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isAuditExpanded && (
                        <div className="mt-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono">
                          {poll.votes.map((v) => (
                            <div
                              key={v.id}
                              className="flex justify-between items-center text-[11px] py-0.5 border-b border-black/5 dark:border-white/5 last:border-none"
                            >
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                Flat {v.wing}-{v.flat_number}
                              </span>
                              <span className="text-slate-400">{v.full_name}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                  v.choice === "YES"
                                    ? "text-emerald-500 bg-emerald-500/10"
                                    : v.choice === "NO"
                                    ? "text-rose-500 bg-rose-500/10"
                                    : "text-slate-400 bg-slate-500/10"
                                }`}
                              >
                                {v.choice}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Publish Poll Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border-glass)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-[var(--text-primary)] transition-colors duration-200 text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Publish Digital AGM Resolution
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Create an official electronic resolution for democratic 1-Flat-1-Vote ballots on society expenditures, major repairs, or bylaws.
            </p>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Title
                </label>
                <input
                  type="text"
                  required
                  value={newPoll.title}
                  onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                  placeholder="e.g. Solar Rooftop Net Metering Proposal"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description & Scope
                </label>
                <textarea
                  rows={3}
                  required
                  value={newPoll.description}
                  onChange={(e) =>
                    setNewPoll({ ...newPoll, description: e.target.value })
                  }
                  placeholder="Detailed breakdown of costs, vendor quotes, and statutory benefits..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ballot Options (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={newPoll.options}
                  onChange={(e) => setNewPoll({ ...newPoll, options: e.target.value })}
                  placeholder="YES, NO, ABSTAIN"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Voting Starts
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newPoll.startDate}
                    onChange={(e) =>
                      setNewPoll({ ...newPoll, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Voting Ends
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newPoll.endDate}
                    onChange={(e) =>
                      setNewPoll({ ...newPoll, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-slate-700 dark:text-slate-300 text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs shadow-md shadow-[#F59E0B]/20 cursor-pointer"
                >
                  Publish for Voting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgmPollsPage;
