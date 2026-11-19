import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Building2, Shield, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

const DEMO_ACCOUNTS = [
  { role: "ADMIN", email: "admin@vastuledger.in", name: "Arun Prasad (Super-Admin)", desc: "Rules, Config, Audit Logs" },
  { role: "TREASURER", email: "treasurer@vastuledger.in", name: "Deepa Sharma (Treasurer)", desc: "Bills, UTR Reconciliation, Expenses" },
  { role: "COMMITTEE", email: "committee1@vastuledger.in", name: "Sanjay Joshi (Committee)", desc: "Expense Approvals, AGM Polls" },
  { role: "RESIDENT", email: "rajesh@vastuledger.in", name: "Rajesh Kulkarni (Flat A-101)", desc: "Scan UPI QR, Pay, Vote" },
];

export function LoginPage() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword("Vastu@2026");
    setError("");
    setLoading(true);

    try {
      await login({ email: demoEmail, password: "Vastu@2026" });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200">
      {/* Background Architectural Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#14B8A6]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Theme Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-md transition"
          title={isDark ? "Switch to Limestone Light" : "Switch to Obsidian Dark"}
        >
          {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 space-y-3">
        <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-[#0B0F17] shadow-2xl shadow-[#F59E0B]/30">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
          Vastu<span className="text-[#F59E0B]">Ledger</span>
        </h1>
        <p className="text-xs font-mono text-[#14B8A6] uppercase tracking-wider font-semibold">
          Enterprise Indian RWA Financial & Compliance OS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-[var(--border-glass)] space-y-6"
        >
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#E11D48]/10 border border-[#E11D48]/20 text-[#E11D48] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Official RWA Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vastuledger.in"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-[#F59E0B] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-input)] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-[#F59E0B] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-[#0B0F17] font-semibold transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F59E0B]/20"
            >
              {loading ? "Authenticating..." : "Sign In to Portal"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Sign-In Buttons */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-[#F59E0B]">
                <Sparkles className="w-3.5 h-3.5" /> One-Click Role Switcher
              </span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">Pass: Vastu@2026</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemo(acc.email)}
                  className="p-2.5 text-left rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-subtle)] transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#F59E0B]">
                      {acc.role}
                    </span>
                    <Shield className="w-3 h-3 text-slate-400 group-hover:text-[#F59E0B]" />
                  </div>
                  <p className="text-[11px] text-slate-900 dark:text-white font-medium truncate mt-0.5">{acc.name.split(" ")[0]}</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{acc.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginPage;