import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Edit,
  X,
  RefreshCw,
} from "lucide-react";
import * as societyService from "../../services/societyService.js";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function PlatformSocietiesPage() {
  const { user } = useAuth();
  const { currentSocietyId, switchSociety, reloadSocieties } = useSocietyConfig();
  const navigate = useNavigate();

  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    registrationNumber: "",
    address: "",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411045",
    contactEmail: "",
    contactPhone: "",
  });

  const fetchSocieties = async () => {
    setLoading(true);
    try {
      const data = await societyService.listSocieties();
      setSocieties(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg("Failed to load platform societies: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSociety = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const created = await societyService.createSociety(formData);
      await fetchSocieties();
      await reloadSocieties();
      setModalOpen(false);
      setFormData({
        name: "",
        registrationNumber: "",
        address: "",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411045",
        contactEmail: "",
        contactPhone: "",
      });

      // Automatically offer switching to newly created society
      if (created?.id) {
        switchSociety(created.id);
        navigate("/admin");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Could not onboard society");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAndGo = (socId, targetRoute = "/") => {
    switchSociety(socId);
    navigate(targetRoute);
  };

  const filteredSocieties = societies.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(query) ||
      s.city?.toLowerCase().includes(query) ||
      s.registration_number?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Platform Banner Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#131A26] via-[#0E141F] to-[#0B0F17] border border-[#F59E0B]/30 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#F59E0B]/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F59E0B] px-2.5 py-1 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                SuperAdmin Multi-Tenant Hub
              </span>
              <span className="text-xs font-mono text-[#14B8A6] px-2.5 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20">
                100% Free SaaS Layer
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              Platform Housing Societies
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Manage multi-tenant society instances with complete database row-level isolation, independent
              SHA-256 accounting ledgers, wings, floors, and alphanumeric flat topologies.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-[#0B0F17] font-bold text-xs shadow-lg shadow-[#F59E0B]/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Onboard New Housing Society</span>
          </button>
        </div>

        {/* Global Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Total Societies
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {societies.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Active Tenants
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#14B8A6]">
              {societies.filter((s) => s.status !== "SUSPENDED").length}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Platform Status
            </span>
            <span className="text-xs font-mono font-bold text-[#F59E0B] flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> High Availability
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Commercial Tier
            </span>
            <span className="text-xs font-mono text-slate-200 mt-1 block">
              Unlimited Free Access
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by society name, city, or registration number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:border-[#F59E0B] transition"
          />
        </div>

        <button
          onClick={fetchSocieties}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Societies Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-400">
          Loading platform societies...
        </div>
      ) : filteredSocieties.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No Housing Societies Found
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No societies matched "${searchQuery}". Try modifying your search.`
              : "Get started by onboarding your first housing society."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSocieties.map((soc) => {
            const isCurrentlyActive = soc.id === currentSocietyId;

            return (
              <div
                key={soc.id}
                className={`flex flex-col justify-between p-6 rounded-3xl bg-[var(--bg-surface)] border transition-all duration-200 shadow-sm relative ${
                  isCurrentlyActive
                    ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/20 bg-[var(--bg-surface-elevated)]"
                    : "border-[var(--border-subtle)] hover:border-slate-400 dark:hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F59E0B]/15 to-[#D97706]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    {isCurrentlyActive ? (
                      <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                        ACTIVE CONTEXT
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-[var(--border-subtle)]">
                        ID #{soc.id}
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                    {soc.name}
                  </h3>
                  <p className="text-[11px] font-mono text-[#F59E0B] mt-0.5">
                    Reg: {soc.registration_number || "PENDING"}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {soc.address}, {soc.city} - {soc.pincode}
                      </span>
                    </div>
                    {soc.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{soc.contact_email}</span>
                      </div>
                    )}
                    {soc.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{soc.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2">
                  {isCurrentlyActive ? (
                    <button
                      onClick={() => navigate("/admin")}
                      className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[#F59E0B]/40 hover:border-[#F59E0B] text-[#F59E0B] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Manage Wings & Flats</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSwitchAndGo(soc.id, "/")}
                      className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[#F59E0B] text-slate-700 dark:text-slate-200 hover:text-[#F59E0B] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <span>Switch to this Society</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Onboard Housing Society Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                    Onboard New Housing Society
                  </h2>
                  <p className="text-xs text-slate-400">
                    Provisions isolated tenant ledger, default billing rates & wings.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#E11D48]/15 border border-[#E11D48]/30 text-[#E11D48] text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSociety} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Housing Society Name *
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Pride Panorama Co-operative Housing Society"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State RWA Registration No. *
                  </label>
                  <input
                    type="text"
                    required
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. MAH/PUN/RWA/2026/788192"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Pune"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line *
                </label>
                <input
                  type="text"
                  required
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. Plot 42, Senapati Bapat Road, Shivaji Nagar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="e.g. 411016"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="society-office@pridepanorama.org"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="+91 98220 12345"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Onboarding Society..." : "Confirm & Provision Society"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
