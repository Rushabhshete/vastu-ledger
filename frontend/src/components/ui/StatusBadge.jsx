import React from "react";

export function StatusBadge({ status, className = "" }) {
  const norm = String(status || "").toUpperCase();

  let styles = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  let dotColor = "bg-slate-400";
  let label = norm;

  switch (norm) {
    case "PAID":
    case "VERIFIED":
    case "APPROVED":
      styles = "bg-[#14B8A6]/15 text-[#14B8A6] border-[#14B8A6]/30";
      dotColor = "bg-[#14B8A6]";
      label = norm === "VERIFIED" ? "Reconciled" : norm === "APPROVED" ? "Approved" : "Paid";
      break;

    case "PENDING":
    case "PENDING_APPROVAL":
    case "SUBMITTED":
      styles = "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30";
      dotColor = "bg-[#F59E0B]";
      label = norm === "PENDING_APPROVAL" ? "Needs Approval" : norm === "SUBMITTED" ? "Submitted UTR" : "Pending";
      break;

    case "OVERDUE":
    case "REJECTED":
    case "FAILED":
      styles = "bg-[#E11D48]/15 text-[#E11D48] border-[#E11D48]/30";
      dotColor = "bg-[#E11D48]";
      label = norm === "OVERDUE" ? "Overdue (>10d)" : norm === "REJECTED" ? "Rejected" : "Failed";
      break;

    case "VACANT":
      styles = "bg-slate-500/15 text-slate-400 border-slate-500/30";
      dotColor = "bg-slate-400";
      label = "Vacant";
      break;

    case "CREDIT":
      styles = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      dotColor = "bg-emerald-400";
      label = "Credit (+)";
      break;

    case "DEBIT":
      styles = "bg-rose-500/15 text-rose-400 border-rose-500/30";
      dotColor = "bg-rose-400";
      label = "Debit (-)";
      break;

    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

export default StatusBadge;
