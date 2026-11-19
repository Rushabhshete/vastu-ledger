import React from "react";
import { motion } from "motion/react";
import StatusBadge from "../ui/StatusBadge.jsx";
import { Building2 } from "lucide-react";

export function FallbackWingMap({ flats = [], onSelectFlat, selectedFlat }) {
  // Group flats dynamically by wing
  const wingsMap = {};
  flats.forEach((f) => {
    const wKey = f.wing || f.wing_name || "A";
    if (!wingsMap[wKey]) wingsMap[wKey] = [];
    wingsMap[wKey].push(f);
  });

  const wingKeys = Object.keys(wingsMap).sort();

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xl transition-colors duration-200 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            2D Architectural Isometric View
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dynamic society layout · {flats.length} units across {wingKeys.length} wings
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" /> Paid
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Pending
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" /> Overdue
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Vacant
          </span>
        </div>
      </div>

      <div
        className={`grid gap-5 flex-1 overflow-y-auto ${
          wingKeys.length === 1
            ? "grid-cols-1"
            : wingKeys.length === 2
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {wingKeys.map((wKey, idx) => {
          const wingUnits = wingsMap[wKey];
          const wingThemeColor = idx % 2 === 0 ? "text-[#F59E0B]" : "text-[#14B8A6]";

          return (
            <div
              key={wKey}
              className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-3 overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className={`text-xs font-bold tracking-wide uppercase ${wingThemeColor}`}>
                  Wing {wKey}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {wingUnits.length} Units
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {wingUnits.map((flat) => {
                  const isSelected = selectedFlat?.id === flat.id;
                  const isVacant = flat.occupancy_type === "VACANT";
                  const statusVal =
                    flat.bill_status || flat.status || (isVacant ? "VACANT" : "PAID");
                  const statusColor =
                    isVacant
                      ? "border-slate-500/40 hover:border-slate-400 bg-slate-500/10"
                      : statusVal === "PAID"
                      ? "border-[#14B8A6]/40 hover:border-[#14B8A6] bg-[#14B8A6]/10"
                      : statusVal === "OVERDUE"
                      ? "border-[#E11D48]/40 hover:border-[#E11D48] bg-[#E11D48]/10"
                      : "border-[#F59E0B]/40 hover:border-[#F59E0B] bg-[#F59E0B]/10";

                  const ownerDisplay =
                    flat.resident_name ||
                    flat.owner ||
                    (isVacant ? "Vacant Unit" : `Resident (${flat.number})`);
                  const amountDisplay =
                    flat.unpaid_amount !== undefined && Number(flat.unpaid_amount) > 0
                      ? `₹${Number(flat.unpaid_amount).toLocaleString("en-IN")}`
                      : flat.latest_bill_amount !== undefined && Number(flat.latest_bill_amount) > 0
                      ? `₹${Number(flat.latest_bill_amount).toLocaleString("en-IN")}`
                      : flat.amount ||
                        (flat.area_sqft
                          ? `₹${(Number(flat.area_sqft) * 5.5).toLocaleString("en-IN")}`
                          : "₹7,500");

                  return (
                    <motion.button
                      key={flat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelectFlat && onSelectFlat({ ...flat, owner: ownerDisplay, amount: amountDisplay, status: statusVal })}
                      className={`p-3 rounded-xl border text-left transition relative ${statusColor} ${
                        isSelected ? "ring-2 ring-[#F59E0B] shadow-lg" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          Flat {flat.number}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                          {flat.bhk}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 truncate mt-1 font-medium">
                        {ownerDisplay}
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-[var(--border-subtle)]">
                        <StatusBadge status={statusVal} className="text-[10px] px-1.5 py-0" />
                        <span className="font-mono text-[11px] text-slate-800 dark:text-slate-300 font-semibold">
                          {amountDisplay}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FallbackWingMap;
