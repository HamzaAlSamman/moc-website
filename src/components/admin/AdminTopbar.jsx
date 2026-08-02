"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { useShell } from "./AdminShell";
import { ROLE_LABELS } from "@/lib/permissions";

const PAGE_TITLES = {
  "/admin/dashboard":  "لوحة التحكم",
  "/admin/posts":      "الأخبار",
  "/admin/events":     "الفعاليات الثقافية",
  "/admin/categories": "التصنيفات",
  "/admin/media":      "مكتبة الوسائط",
  "/admin/users":      "إدارة المستخدمين",
  "/admin/settings":   "إعدادات الموقع",
};

function getPageTitle(pathname) {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  return "لوحة التحكم";
}

function timeAgoAr(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} ${mins === 1 ? "دقيقة" : "دقائق"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
}

export default function AdminTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, sidebarOpen, setSidebarOpen, setMobileSidebarOpen } = useShell();

  const pageTitle = getPageTitle(pathname);
  const roleLabel = ROLE_LABELS.ar[user?.role] ?? "";

  // ── Notifications ────────────────────────────────────────────────────
  // Polled (not pushed) — this CMS has no websocket/SSE layer, and a handful
  // of staff accounts means a 60s poll is plenty responsive without adding
  // infrastructure. Turns the previously-decorative bell into a real inbox.
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleOpenNotification(n) {
    if (!n.isRead) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/admin/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
    setUnreadCount(0);
    fetch("/api/admin/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  return (
    <header className="relative bg-white border-b border-gray-200/80 flex items-center justify-between px-3 md:px-6 shrink-0 shadow-sm h-14 md:h-20 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="افتح القائمة الجانبية"
          className="p-2.5 rounded-xl text-gray-500 hover:bg-[#003D33]/5 hover:text-[#003D33] flex md:hidden items-center justify-center transition-all duration-300"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "تصغير القائمة" : "توسيع القائمة"}
          className="p-2.5 rounded-xl text-gray-500 hover:bg-[#003D33]/5 hover:text-[#003D33] hidden md:flex items-center justify-center transition-all duration-300"
        >
          <Menu className={`w-5 h-5 transition-transform duration-300 ${!sidebarOpen ? "rotate-90" : ""}`} />
        </button>

        <h1 className="text-lg md:text-xl font-bold text-gray-800 hidden sm:block">
          {pageTitle}
        </h1>
        <span className="text-base font-bold text-gray-800 sm:hidden block">
          {pageTitle}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="الإشعارات"
            aria-expanded={open}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors group outline-none"
          >
            <Bell className="w-5 h-5 text-gray-500 group-hover:text-[#003D33] transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full number-circle bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute end-0 top-full mt-2 w-80 max-w-[90vw] rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-bold text-gray-800">الإشعارات</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs font-medium text-[#A48E68] hover:underline">
                    تعليم الكل كمقروء
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-400">لا توجد إشعارات حالياً</p>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleOpenNotification(n)}
                      className={`flex w-full flex-col items-start gap-0.5 border-b border-gray-50 px-4 py-3 text-start transition-colors hover:bg-gray-50 ${
                        !n.isRead ? "bg-[#A48E68]/5" : ""
                      }`}
                    >
                      <div className="flex w-full items-start gap-2">
                        {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A48E68]" />}
                        <span className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                          {n.titleAr}
                        </span>
                      </div>
                      <span className="ms-3.5 text-xs text-gray-400">{timeAgoAr(n.createdAt)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* User info */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md ring-2 ring-[#A48E68]/20 shrink-0"
            style={{ background: "linear-gradient(135deg, #003D33, #005544)" }}
          >
            {user?.nameAr?.[0] ?? "م"}
          </div>
          <div className="hidden sm:flex flex-col text-start">
            <span className="text-sm font-bold text-gray-900 truncate max-w-[140px]">
              {user?.nameAr}
            </span>
            <span className="text-xs font-medium" style={{ color: "#A48E68" }}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
