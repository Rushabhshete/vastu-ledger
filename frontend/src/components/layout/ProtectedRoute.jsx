import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext.jsx";
import { ShieldAlert } from "lucide-react";

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const isAllowed = Boolean(user?.isSuperadmin) || allowedRoles.includes(user?.role);
    if (!isAllowed) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-md p-8 glass-panel rounded-3xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E11D48]/15 text-[#E11D48] flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">403 — Restricted Module</h2>
            <p className="text-xs text-slate-300">
              Your authenticated role (<span className="font-mono text-[#F59E0B]">{user?.role}</span>) does not have clearance for this operational section.
            </p>
            <a
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0F17] font-semibold text-xs transition"
            >
              Return to Command Center
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
}

export default ProtectedRoute;
