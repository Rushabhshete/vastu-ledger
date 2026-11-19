import React, { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, Clock, AlertTriangle, CheckCheck, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import * as notificationService from "../../services/notificationService.js";
import { useSocietyConfig } from "../../context/SocietyConfigContext.jsx";

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentSocietyId } = useSocietyConfig();
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications({ limit: 25 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("[NotificationBell] Failed to fetch notifications:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when society changes or component mounts
  useEffect(() => {
    fetchNotifications();
  }, [currentSocietyId, fetchNotifications]);

  // Fetch when opening dropdown
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleItemClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
        );
      }
    } catch (err) {
      console.error("[NotificationBell] Error marking as read:", err.message);
    }

    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error("[NotificationBell] Error marking all as read:", err.message);
    }
  };

  const renderIcon = (type) => {
    switch (type) {
      case "UPI":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "EXPENSE":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "POLL":
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-[var(--bg-surface)] animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 glass-dropdown rounded-2xl shadow-2xl p-4 z-50 text-left border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-semibold">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium transition cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-[var(--border-subtle)] max-h-80 overflow-y-auto mt-2 space-y-1">
                {loading && notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.is_read;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleItemClick(n)}
                        className={`py-2.5 px-2.5 rounded-xl transition flex items-start gap-3 cursor-pointer ${
                          isUnread
                            ? "bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15"
                            : "hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 shrink-0 mt-0.5">
                          {renderIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p
                              className={`text-xs truncate ${
                                isUnread
                                  ? "font-semibold text-slate-900 dark:text-white"
                                  : "font-medium text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {n.title}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatTimeAgo(n.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                            {n.detail}
                          </p>
                          {n.link && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 font-medium mt-1">
                              View details <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
