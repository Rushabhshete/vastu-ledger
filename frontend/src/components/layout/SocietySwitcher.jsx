import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Building2, ChevronDown, Check, Plus, Shield, MapPin } from "lucide-react";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";

export default function SocietySwitcher() {
  const {
    currentSociety,
    currentSocietyId,
    availableSocieties,
    switchSociety,
    societyName,
    isSuperadmin,
  } = useSocietyConfig();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[#F59E0B]/50 transition-all shadow-sm text-left group"
        title="Switch Housing Society"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F59E0B]/20 to-[#D97706]/20 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-[#F59E0B] font-semibold tracking-wider">
                Society
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {societyName}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? "rotate-180 text-[#F59E0B]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/5 dark:bg-white/5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Select Housing Society ({availableSocieties.length})
            </span>
            {isSuperadmin && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-bold border border-[#F59E0B]/30">
                SUPERADMIN
              </span>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {availableSocieties.map((soc) => {
              const isSelected = soc.id === currentSocietyId;
              return (
                <button
                  key={soc.id}
                  onClick={() => {
                    switchSociety(soc.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] font-semibold border border-[#F59E0B]/30"
                      : "text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold truncate">{soc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                      {soc.city && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {soc.city}
                        </span>
                      )}
                      {soc.registration_number && (
                        <span className="truncate">Reg: {soc.registration_number}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#F59E0B] text-[#0B0F17] flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {isSuperadmin && (
            <div className="p-2 border-t border-[var(--border-subtle)] bg-black/5 dark:bg-white/5">
              <Link
                to="/platform/societies"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-bold text-xs transition shadow-md"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Onboard / Manage Societies</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
