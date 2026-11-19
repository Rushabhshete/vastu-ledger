import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Layers,
  Plus,
  Sparkles,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowUpDown,
  Home,
  User,
  MapPin,
  RefreshCw,
} from "lucide-react";
import GlassCard from "../ui/GlassCard.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as societyService from "../../services/societyService.js";

export default function SocietyTopologyManager() {
  const { currentSocietyId, societyName } = useSocietyConfig();

  const [wings, setWings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [selectedWing, setSelectedWing] = useState("ALL");
  const [selectedFloor, setSelectedFloor] = useState("ALL");
  const [selectedOccupancy, setSelectedOccupancy] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [wingModalOpen, setWingModalOpen] = useState(false);
  const [wingEdit, setWingEdit] = useState(null);
  const [flatModalOpen, setFlatModalOpen] = useState(false);
  const [flatEdit, setFlatEdit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [wingForm, setWingForm] = useState({
    name: "",
    code: "",
    totalFloors: 5,
    hasElevator: true,
  });

  const [autoGenForm, setAutoGenForm] = useState({
    wingId: "",
    wingCode: "",
    startFloor: 1,
    totalFloors: 5,
    flatsPerFloor: 4,
    defaultBhk: "2BHK",
    defaultAreaSqft: 1100,
    numberPrefix: "",
  });

  const [flatForm, setFlatForm] = useState({
    wingId: "",
    wing: "",
    floor: 1,
    number: "",
    address: "",
    areaSqft: 1100,
    bhk: "2BHK",
    isOccupied: true,
    occupancyType: "OWNER_OCCUPIED",
  });

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg("");
    try {
      const [w, f] = await Promise.all([
        societyService.listWings(currentSocietyId),
        societyService.listFlats(currentSocietyId),
      ]);
      setWings(Array.isArray(w) ? w : []);
      setFlats(Array.isArray(f) ? f : []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to load society topology");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentSocietyId) {
      loadData();
    }
  }, [currentSocietyId]);

  // Flash success notification
  const notifySuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  /* ---------------- Wing Handlers ---------------- */
  const handleOpenWingModal = (wing = null) => {
    if (wing) {
      setWingEdit(wing);
      setWingForm({
        name: wing.name,
        code: wing.code,
        totalFloors: wing.total_floors || 1,
        hasElevator: Boolean(wing.has_elevator),
      });
    } else {
      setWingEdit(null);
      setWingForm({
        name: "",
        code: "",
        totalFloors: 5,
        hasElevator: true,
      });
    }
    setWingModalOpen(true);
  };

  const handleSaveWing = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (wingEdit) {
        await societyService.updateWing(currentSocietyId, wingEdit.id, wingForm);
        notifySuccess(`Wing "${wingForm.name}" updated successfully.`);
      } else {
        await societyService.createWing(currentSocietyId, wingForm);
        notifySuccess(`Wing "${wingForm.name}" created successfully.`);
      }
      setWingModalOpen(false);
      await loadData(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to save wing");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Auto-Generate Flats Handler ---------------- */
  const handleOpenAutoGen = () => {
    const defaultWing = wings[0] || null;
    setAutoGenForm({
      wingId: defaultWing ? defaultWing.id : "",
      wingCode: defaultWing ? defaultWing.code : "A",
      startFloor: 1,
      totalFloors: defaultWing ? defaultWing.total_floors || 5 : 5,
      flatsPerFloor: 4,
      defaultBhk: "2BHK",
      defaultAreaSqft: 1100,
      numberPrefix: defaultWing ? `${defaultWing.code}-` : "A-",
    });
    setAutoGenOpen(true);
  };

  const handleAutoGenSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        wingId: Number(autoGenForm.wingId),
        wingCode: autoGenForm.wingCode,
        startFloor: Number(autoGenForm.startFloor),
        totalFloors: Number(autoGenForm.totalFloors),
        flatsPerFloor: Number(autoGenForm.flatsPerFloor),
        defaultBhk: autoGenForm.defaultBhk,
        defaultAreaSqft: Number(autoGenForm.defaultAreaSqft),
        numberPrefix: autoGenForm.numberPrefix,
      };

      const res = await societyService.autoGenerateFlats(currentSocietyId, payload);
      setAutoGenOpen(false);
      notifySuccess(`Batch generation complete! ${res.insertedCount || "All"} units generated.`);
      await loadData(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Batch generation failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Single Flat CRUD & Alteration Handlers ---------------- */
  const handleOpenFlatModal = (flat = null) => {
    if (flat) {
      setFlatEdit(flat);
      setFlatForm({
        wingId: flat.wing_id || "",
        wing: flat.wing || "A",
        floor: flat.floor || 1,
        number: flat.number,
        address: flat.address || "",
        areaSqft: flat.area_sqft || 1100,
        bhk: flat.bhk || "2BHK",
        isOccupied: Boolean(flat.is_occupied),
        occupancyType: flat.occupancy_type || "OWNER_OCCUPIED",
      });
    } else {
      const defWing = wings[0];
      setFlatEdit(null);
      setFlatForm({
        wingId: defWing ? defWing.id : "",
        wing: defWing ? defWing.code : "A",
        floor: 1,
        number: "",
        address: "",
        areaSqft: 1100,
        bhk: "2BHK",
        isOccupied: true,
        occupancyType: "OWNER_OCCUPIED",
      });
    }
    setFlatModalOpen(true);
  };

  const handleSaveFlat = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        wingId: flatForm.wingId ? Number(flatForm.wingId) : null,
        wing: flatForm.wing.toUpperCase(),
        floor: Number(flatForm.floor),
        number: flatForm.number.trim(),
        address: flatForm.address.trim() || null,
        areaSqft: Number(flatForm.areaSqft),
        bhk: flatForm.bhk,
        isOccupied: flatForm.isOccupied,
        occupancyType: flatForm.occupancyType,
      };

      if (flatEdit) {
        await societyService.updateFlat(currentSocietyId, flatEdit.id, payload);
        notifySuccess(`Flat "${payload.number}" altered successfully.`);
      } else {
        await societyService.createFlat(currentSocietyId, payload);
        notifySuccess(`Flat "${payload.number}" created successfully.`);
      }
      setFlatModalOpen(false);
      await loadData(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to alter flat");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Delete Confirm Handler ---------------- */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.type === "wing") {
        await societyService.deleteWing(currentSocietyId, deleteTarget.id);
        notifySuccess(`Wing "${deleteTarget.label}" and its associated flats were removed.`);
      } else {
        await societyService.deleteFlat(currentSocietyId, deleteTarget.id);
        notifySuccess(`Flat "${deleteTarget.label}" was removed.`);
      }
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await loadData(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Delete operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Filtering & Search ---------------- */
  const filteredFlats = useMemo(() => {
    return flats.filter((f) => {
      if (selectedWing !== "ALL" && f.wing !== selectedWing) return false;
      if (selectedFloor !== "ALL" && Number(f.floor) !== Number(selectedFloor)) return false;
      if (selectedOccupancy !== "ALL" && f.occupancy_type !== selectedOccupancy) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNum = f.number?.toLowerCase().includes(query);
        const matchesResident = f.resident_name?.toLowerCase().includes(query);
        if (!matchesNum && !matchesResident) return false;
      }
      return true;
    });
  }, [flats, selectedWing, selectedFloor, selectedOccupancy, searchQuery]);

  // Extract unique floors for floor filter dropdown
  const availableFloors = useMemo(() => {
    const set = new Set();
    flats.forEach((f) => {
      if (f.floor !== null && f.floor !== undefined) set.add(Number(f.floor));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [flats]);

  return (
    <div className="space-y-6">
      {/* Topology Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[var(--bg-surface-elevated)] to-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] px-2 py-0.5 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30">
              Active Society
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">{societyName}</span>
          </div>
          <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#F59E0B]" />
            Society Topology (Wings & Flats)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-generate entire wing layouts or alter any single alphanumeric flat entity with full
            customization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenWingModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-slate-400 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Add Wing</span>
          </button>

          <button
            onClick={handleOpenAutoGen}
            disabled={wings.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-[#0B0F17] text-xs font-bold shadow-md shadow-[#F59E0B]/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Auto-Generate Flats</span>
          </button>

          <button
            onClick={() => handleOpenFlatModal()}
            disabled={wings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-[#0B0F17] text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Single Flat</span>
          </button>

          <button
            onClick={() => loadData(true)}
            className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-slate-400 hover:text-white transition"
            title="Refresh Topology"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 rounded-2xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 text-[#14B8A6] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-[#E11D48]/15 border border-[#E11D48]/30 text-[#E11D48] text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Wings Grid Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#F59E0B]">
            1. Society Wings ({wings.length})
          </h3>
        </div>

        {wings.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No wings registered yet.
            </p>
            <p className="text-[11px] text-slate-500">
              Click "+ Add Wing" above to create Wing A, Wing B, etc.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wings.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between hover:border-slate-500 transition shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] font-mono font-bold text-sm flex items-center justify-center">
                      {w.code}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-slate-400">
                      {w.total_floors || 1} Floors
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {w.name}
                  </h4>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{w.flat_count || 0} Units Registered</span>
                    {w.has_elevator && <span className="text-[#14B8A6]">· Elevator</span>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleOpenWingModal(w)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#F59E0B] hover:bg-black/5 dark:hover:bg-white/5 transition"
                    title="Edit Wing"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget({ type: "wing", id: w.id, label: w.name });
                      setDeleteModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-black/5 dark:hover:bg-white/5 transition"
                    title="Delete Wing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Flats Directory & Single Entity Alteration */}
      <GlassCard className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F59E0B]">
              2. Flats & Units Directory ({filteredFlats.length} of {flats.length})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Alphanumeric identifiers supported (e.g. A-101, PH-01, Villa-4). Click "Alter" on any unit
              to customize.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Wing Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-xs">
              <button
                onClick={() => setSelectedWing("ALL")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedWing === "ALL"
                    ? "bg-[#F59E0B] text-[#0B0F17]"
                    : "text-slate-600 dark:text-slate-400 hover:text-white"
                }`}
              >
                All Wings
              </button>
              {wings.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWing(w.code)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    selectedWing === w.code
                      ? "bg-[#F59E0B] text-[#0B0F17]"
                      : "text-slate-600 dark:text-slate-400 hover:text-white"
                  }`}
                >
                  Wing {w.code}
                </button>
              ))}
            </div>

            {/* Floor Filter */}
            {availableFloors.length > 0 && (
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Floors</option>
                {availableFloors.map((fl) => (
                  <option key={fl} value={fl}>
                    Floor {fl}
                  </option>
                ))}
              </select>
            )}

            {/* Occupancy Filter */}
            <select
              value={selectedOccupancy}
              onChange={(e) => setSelectedOccupancy(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="OWNER_OCCUPIED">Owner Occupied</option>
              <option value="TENANT_OCCUPIED">Tenant Occupied</option>
              <option value="VACANT">Vacant</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flat number (e.g. A-101) or resident..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>

        {/* Flats Table */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--border-subtle)] text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-4">Flat Number</th>
                <th className="py-2.5 px-3">Wing & Floor</th>
                <th className="py-2.5 px-3">Typology (BHK)</th>
                <th className="py-2.5 px-3">Area (Sq.Ft)</th>
                <th className="py-2.5 px-3">Occupancy</th>
                <th className="py-2.5 px-3">Assigned Resident</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredFlats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No flats found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredFlats.map((flat) => {
                  const occBadgeColor =
                    flat.occupancy_type === "OWNER_OCCUPIED"
                      ? "bg-[#14B8A6]/15 text-[#14B8A6] border-[#14B8A6]/30"
                      : flat.occupancy_type === "TENANT_OCCUPIED"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30";

                  const occLabel =
                    flat.occupancy_type === "OWNER_OCCUPIED"
                      ? "Owner Occupied"
                      : flat.occupancy_type === "TENANT_OCCUPIED"
                      ? "Tenant Occupied"
                      : "Vacant";

                  return (
                    <tr
                      key={flat.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {flat.number}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        Wing {flat.wing || flat.wing_name || "—"} · Floor {flat.floor ?? "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {flat.bhk}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {flat.area_sqft} sq.ft
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${occBadgeColor}`}
                        >
                          {occLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {flat.resident_name ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-[#14B8A6]" />
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {flat.resident_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenFlatModal(flat)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[#F59E0B] text-slate-700 dark:text-slate-300 hover:text-[#F59E0B] text-[11px] font-semibold transition"
                            title="Alter this individual flat"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Alter</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget({
                                type: "flat",
                                id: flat.id,
                                label: `Flat ${flat.number}`,
                              });
                              setDeleteModalOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-[#E11D48] transition"
                            title="Delete this flat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ================= MODAL: Auto-Generate Flats ================= */}
      {autoGenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                    Bulk Auto-Generate Flats
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Floor-by-floor batch unit builder with customizable defaults.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAutoGenOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAutoGenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Wing *
                </label>
                <select
                  required
                  value={autoGenForm.wingId}
                  onChange={(e) => {
                    const wid = Number(e.target.value);
                    const found = wings.find((w) => w.id === wid);
                    setAutoGenForm({
                      ...autoGenForm,
                      wingId: wid,
                      wingCode: found ? found.code : "A",
                      numberPrefix: found ? `${found.code}-` : "A-",
                      totalFloors: found?.total_floors || 5,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                >
                  {wings.map((w) => (
                    <option key={w.id} value={w.id}>
                      Wing {w.code} — {w.name} ({w.total_floors} floors)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Floor
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={autoGenForm.startFloor}
                    onChange={(e) =>
                      setAutoGenForm({ ...autoGenForm, startFloor: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Floors to Generate
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={autoGenForm.totalFloors}
                    onChange={(e) =>
                      setAutoGenForm({ ...autoGenForm, totalFloors: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Flats Per Floor
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={autoGenForm.flatsPerFloor}
                    onChange={(e) =>
                      setAutoGenForm({ ...autoGenForm, flatsPerFloor: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Number Prefix
                  </label>
                  <input
                    type="text"
                    value={autoGenForm.numberPrefix}
                    onChange={(e) =>
                      setAutoGenForm({ ...autoGenForm, numberPrefix: e.target.value })
                    }
                    placeholder="e.g. A- or B-"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default BHK Typology
                  </label>
                  <select
                    value={autoGenForm.defaultBhk}
                    onChange={(e) =>
                      setAutoGenForm({ ...autoGenForm, defaultBhk: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="4BHK">4BHK</option>
                    <option value="PENTHOUSE">PENTHOUSE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Carpet Area (Sq.Ft)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="20000"
                    required
                    value={autoGenForm.defaultAreaSqft}
                    onChange={(e) =>
                      setAutoGenForm({ ...autoGenForm, defaultAreaSqft: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
              </div>

              {/* Summary Pill */}
              <div className="p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-[var(--border-subtle)] text-[11px] font-mono text-slate-400">
                Will auto-generate{" "}
                <span className="text-[#F59E0B] font-bold">
                  {Number(autoGenForm.totalFloors) * Number(autoGenForm.flatsPerFloor)}
                </span>{" "}
                flats (e.g. {autoGenForm.numberPrefix}101 .. {autoGenForm.numberPrefix}
                {Number(autoGenForm.startFloor) + Number(autoGenForm.totalFloors) - 1}0
                {autoGenForm.flatsPerFloor}). Each entity can be individually altered afterwards.
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAutoGenOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Generating..." : "Generate Flats Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Single Flat Alteration / Creation ================= */}
      {flatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  {flatEdit ? `Alter Flat ${flatEdit.number}` : "Create Bespoke Flat"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {flatEdit
                    ? "Modify this single flat entity without affecting others."
                    : "Add an individual custom unit (e.g. PH-01, Villa-4)."}
                </p>
              </div>
              <button
                onClick={() => setFlatModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFlat} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Flat Number (Alphanumeric) *
                  </label>
                  <input
                    type="text"
                    required
                    value={flatForm.number}
                    onChange={(e) => setFlatForm({ ...flatForm, number: e.target.value })}
                    placeholder="e.g. A-101, PH-01"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wing *
                  </label>
                  <select
                    value={flatForm.wingId}
                    onChange={(e) => {
                      const wid = Number(e.target.value);
                      const found = wings.find((w) => w.id === wid);
                      setFlatForm({
                        ...flatForm,
                        wingId: wid,
                        wing: found ? found.code : "A",
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                  >
                    {wings.map((w) => (
                      <option key={w.id} value={w.id}>
                        Wing {w.code} ({w.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={flatForm.floor}
                    onChange={(e) => setFlatForm({ ...flatForm, floor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Typology (BHK)
                  </label>
                  <select
                    value={flatForm.bhk}
                    onChange={(e) => setFlatForm({ ...flatForm, bhk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="4BHK">4BHK</option>
                    <option value="PENTHOUSE">PENTHOUSE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Area (Sq.Ft) *
                  </label>
                  <input
                    type="number"
                    min="50"
                    required
                    value={flatForm.areaSqft}
                    onChange={(e) => setFlatForm({ ...flatForm, areaSqft: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Occupancy Status
                  </label>
                  <select
                    value={flatForm.occupancyType}
                    onChange={(e) =>
                      setFlatForm({ ...flatForm, occupancyType: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="OWNER_OCCUPIED">Owner Occupied</option>
                    <option value="TENANT_OCCUPIED">Tenant Occupied</option>
                    <option value="VACANT">Vacant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Address / Notes
                </label>
                <input
                  type="text"
                  value={flatForm.address}
                  onChange={(e) => setFlatForm({ ...flatForm, address: e.target.value })}
                  placeholder="e.g. Corner unit with terrace garden"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFlatModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-[#0B0F17] font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : flatEdit ? "Save Alterations" : "Create Flat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Wing Create/Edit ================= */}
      {wingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  {wingEdit ? `Edit Wing ${wingEdit.code}` : "Add New Wing"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Defines tower boundaries, floor height and elevator provisions.
                </p>
              </div>
              <button
                onClick={() => setWingModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWing} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Wing Name *
                </label>
                <input
                  type="text"
                  required
                  value={wingForm.name}
                  onChange={(e) => setWingForm({ ...wingForm, name: e.target.value })}
                  placeholder="e.g. Lotus Tower or North Wing"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wing Code (e.g. A, B, C) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={wingForm.code}
                    onChange={(e) =>
                      setWingForm({ ...wingForm, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. A"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Floors
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={wingForm.totalFloors}
                    onChange={(e) =>
                      setWingForm({ ...wingForm, totalFloors: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hasElevator"
                  checked={wingForm.hasElevator}
                  onChange={(e) => setWingForm({ ...wingForm, hasElevator: e.target.checked })}
                  className="rounded text-[#F59E0B] focus:ring-[#F59E0B]"
                />
                <label
                  htmlFor="hasElevator"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Equipped with operational elevator(s)
                </label>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setWingModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : wingEdit ? "Update Wing" : "Create Wing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Delete Confirmation ================= */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E11D48]/15 border border-[#E11D48]/30 text-[#E11D48] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Confirm Deletion
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-white">{deleteTarget.label}</span>?
                {deleteTarget.type === "wing" &&
                  " All flats associated with this wing will also be permanently deleted."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
