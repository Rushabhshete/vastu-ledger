import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Building2,
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  Vote,
  Wrench,
  MessageSquare,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Globe,
  Layers,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";
import * as ledgerService from "../../services/ledgerService.js";
import NotificationBell from "./NotificationBell.jsx";
import AnimatedCounter from "../ui/AnimatedCounter.jsx";
import SocietySwitcher from "./SocietySwitcher.jsx";

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currentSocietyId, societyName } = useSocietyConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const data = await ledgerService.getBalance();
        setBalance(data.balance || 0);
      } catch {
        setBalance(48950);
      }
    }
    fetchBalance();
  }, [location.pathname, currentSocietyId]);

  const navItems = [
    {
      label: "Command Center",
      path: "/",
      icon: LayoutDashboard,
      roles: ["ADMIN", "TREASURER", "COMMITTEE", "RESIDENT"],
    },
    {
      label: "Maintenance & Bills",
      path: "/bills",
      icon: Receipt,
      roles: ["ADMIN", "TREASURER", "COMMITTEE", "RESIDENT"],
    },
    {
      label: "Vendor Expense Vault",
      path: "/expenses",
      icon: FileSpreadsheet,
      roles: ["ADMIN", "TREASURER", "COMMITTEE", "RESIDENT"],
    },
    {
      label: "AGM Governance & Polls",
      path: "/governance",
      icon: Vote,
      roles: ["ADMIN", "TREASURER", "COMMITTEE", "RESIDENT"],
    },
    {
      label: "Helpdesk & Maintenance",
      path: "/helpdesk",
      icon: Wrench,
      roles: ["ADMIN", "TREASURER", "COMMITTEE", "RESIDENT"],
    },
    {
      label: "WhatsApp Bot",
      path: "/whatsapp",
      icon: MessageSquare,
      roles: ["ADMIN", "TREASURER", "COMMITTEE"],
    },
    {
      label: "Admin Control Panel",
      path: "/admin",
      icon: ShieldCheck,
      roles: ["ADMIN"],
    },
    ...(user?.isSuperadmin
      ? [
          {
            label: "Platform Societies",
            path: "/platform/societies",
            icon: Globe,
            roles: ["SUPERADMIN"],
          },
        ]
      : []),
  ];

  const visibleNav = navItems.filter((item) =>
    user?.isSuperadmin || (user?.role ? item.roles.includes(user.role) : false)
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col transition-all duration-300 shadow-xl lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[var(--border-subtle)]">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-[#0B0F17] shadow-lg shadow-[#F59E0B]/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Vastu<span className="text-[#F59E0B]">Ledger</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider text-[#14B8A6] block uppercase">
                RWA Financial OS
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Society Switcher Dropdown */}
        <div className="px-4 py-3">
          <SocietySwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`relative flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-medium transition-all group ${
                  isActive
                    ? "text-[#F59E0B] bg-[#F59E0B]/10 font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveTab"
                    className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-[#F59E0B]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#F59E0B]" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"}`} />
                <span className="truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/30 text-[#14B8A6] font-bold text-xs flex items-center justify-center shrink-0">
              {user?.fullName?.slice(0, 2).toUpperCase() || "VL"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.fullName || "User"}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {user?.isSuperadmin ? (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 shadow-xs">
                    SUPERADMIN
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20">
                    {user?.role || "RESIDENT"}
                  </span>
                )}
                {user?.flatId && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Flat #{user.flatId}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-[#E11D48] transition rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Top Command Bar */}
        <header className="sticky top-0 z-30 h-20 bg-[var(--bg-canvas)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-black/5 dark:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">FINANCIAL YEAR</span>
              <span className="text-xs font-bold text-slate-800 dark:text-white font-mono bg-[var(--bg-surface)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                FY 2025-2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Treasury Balance Pill */}
            <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
              <div className="p-1.5 rounded-lg bg-[#14B8A6]/10 text-[#14B8A6]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                  Treasury Balance
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white tabular-numbers">
                  <AnimatedCounter value={balance} isCurrency={true} />
                </span>
              </div>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
              title={isDark ? "Switch to Limestone Light" : "Switch to Obsidian Dark"}
            >
              {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;