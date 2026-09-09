"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Newspaper,
  CalendarDays,
  Tag,
  ImageIcon,
  Users,
  Settings,
  LogOut,
  Globe,
  Inbox,
  Award,
  Copyright,
  QrCode,
  ChevronDown,
  Layers,
  ShieldCheck,
  MapPin,
  Bookmark,
  FileKey2,
  ShieldAlert,
  Handshake,
  Mail,
  Languages,
} from "lucide-react";
import { useShell } from "./AdminShell";
import { can, ROLE_LABELS } from "@/lib/permissions";

const navGroups = [
  {
    labelAr: "الرئيسية",
    items: [
      { href: "/admin/dashboard", icon: LayoutDashboard, labelAr: "لوحة التحكم", permission: "VIEW_DASHBOARD" },
    ],
  },
  {
    labelAr: "المحتوى",
    items: [
      { href: "/admin/posts",      icon: Newspaper,   labelAr: "الأخبار", permission: "CREATE_POST" },
      { href: "/admin/achievements", icon: Award,     labelAr: "الإنجازات",          permission: "CREATE_ACHIEVEMENT" },
      { href: "/admin/bookings",   icon: CalendarDays, labelAr: "إدارة الحجوزات", permission: "VIEW_EVENT_BOOKINGS" },
      { href: "/admin/scan",       icon: QrCode,       labelAr: "تدقيق التذاكر",  permission: "SCAN_EVENT_TICKETS" },
      { href: "/admin/events",     icon: CalendarDays, labelAr: "الفعاليات",          permission: "VIEW_EVENTS" },
      { href: "/admin/language-review", icon: Languages, labelAr: "التدقيق اللغوي", permission: "REVIEW_EVENT_LANGUAGE" },
      { href: "/admin/categories", icon: Tag,          labelAr: "التصنيفات",          permission: "MANAGE_CATEGORIES" },
      { href: "/admin/event-categories",icon: Layers,  labelAr: "فئات الفعاليات",    permission: "CREATE_EVENT" },
      { href: "/admin/event-kinds",     icon: Bookmark, labelAr: "أنواع الفعاليات",   permission: "CREATE_EVENT" },
      { href: "/admin/cultural-centers", icon: MapPin,   labelAr: "المراكز الثقافية",   permission: "CREATE_EVENT" },
      { href: "/admin/media",      icon: ImageIcon,    labelAr: "مكتبة الوسائط",     permission: "UPLOAD_MEDIA" },
    ],
  },
  {
    labelAr: "الخدمات",
    items: [
      { href: "/admin/citizens", icon: Users, labelAr: "حسابات المواطنين", permission: "REVIEW_CITIZEN_IDENTITY" },
      { href: "/admin/event-submissions", icon: Inbox,      labelAr: "طلبات الفعاليات", permission: "VIEW_SUBMISSIONS" },
      { href: "/admin/copyright",   icon: Copyright,  labelAr: "حقوق المؤلف",     permission: "VIEW_SUBMISSIONS" },
      { href: "/admin/legal-licenses", icon: FileKey2, labelAr: "التراخيص القانونية", permission: "VIEW_LEGAL_LICENSES" },
      { href: "/admin/oversight-complaints", icon: ShieldAlert, labelAr: "شكاوى الرقابة الداخلية", permission: "REVIEW_OVERSIGHT_COMPLAINTS" },
      { href: "/admin/cooperation-messages", icon: Handshake, labelAr: "التعاون الدولي", permission: "REVIEW_COOPERATION_MESSAGES" },
    ],
    // EVENT_MANAGER sees only this group and Events from المحتوى
    eventManagerOnly: false,
  },
  {
    labelAr: "الإدارة",
    items: [
      { href: "/admin/users",    icon: Users,    labelAr: "المستخدمون", permission: "VIEW_USERS" },
      { href: "/admin/audit-log", icon: ShieldCheck, labelAr: "سجل التدقيق", permission: "VIEW_AUDIT_LOG" },
      { href: "/admin/emails", icon: Mail, labelAr: "سجل البريد", permission: "VIEW_EMAIL_OUTBOX" },
      { href: "/admin/settings", icon: Settings, labelAr: "الإعدادات",  permission: "VIEW_SETTINGS" },
    ],
  },
];

function isActive(pathname, href, isAchievementContext = false) {
  if (href === "/admin/dashboard") return pathname === href;
  // Achievements live under the shared /admin/posts route (new & edit), so the
  // path alone can't tell them apart from news. We disambiguate via the
  // `?type=ACHIEVEMENT` flag carried by achievement new/edit links.
  if (href === "/admin/posts") {
    return pathname.startsWith("/admin/posts") && !isAchievementContext;
  }
  if (href === "/admin/achievements") {
    return (
      pathname.startsWith("/admin/achievements") ||
      (pathname.startsWith("/admin/posts") && isAchievementContext)
    );
  }
  return pathname.startsWith(href);
}

export default function AdminSidebar({ collapsed, onLinkClick }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useShell();

  // Per-role nav scoping: some roles only see the slice of the panel that maps
  // to their job. `null` means "no extra restriction beyond permissions".
  const role = user?.role;
  const roleAllowedHrefs =
    role === "EVENT_MANAGER"
      ? ["/admin/events", "/admin/bookings", "/admin/event-categories", "/admin/event-kinds", "/admin/cultural-centers", "/admin/event-submissions", "/admin/dashboard"]
      : role === "DIRECTORATE"
        ? ["/admin/events", "/admin/bookings", "/admin/scan", "/admin/dashboard"]
      : role === "MEDIA_OFFICE"
        ? ["/admin/posts", "/admin/achievements", "/admin/categories", "/admin/dashboard"]
        : ["FINANCE", "STUDIES_ASSESSOR", "STUDIES_HEAD"].includes(role)
          ? ["/admin/copyright", "/admin/dashboard"]
          : ["LEGAL_DIRECTOR", "DEPUTY_MINISTER"].includes(role)
            ? ["/admin/copyright", "/admin/legal-licenses", "/admin/dashboard"]
            : ["LICENSING_OFFICER", "LICENSING_COMMITTEE"].includes(role)
              ? ["/admin/legal-licenses", "/admin/dashboard"]
              // Door staff get exactly one screen. No dashboard link either:
              // these accounts live on shared phones at a public entrance.
              : role === "TICKET_OFFICER"
                ? ["/admin/scan"]
                // Proofreads event English and reviews citizen IDs — the media
                // library is reachable (the event form uploads through it) but
                // stays out of the nav, which is scoped to the two jobs.
                : role === "LANGUAGE_IDENTITY_REVIEWER"
                  ? ["/admin/events", "/admin/language-review", "/admin/citizens", "/admin/dashboard"]
                  : null;
  const isVisible = (item) =>
    can(role, item.permission) && (!roleAllowedHrefs || roleAllowedHrefs.includes(item.href));

  // True when viewing/creating/editing an achievement, which shares the
  // /admin/posts route but carries ?type=ACHIEVEMENT in its links.
  const isAchievementContext =
    pathname.startsWith("/admin/posts") && searchParams.get("type") === "ACHIEVEMENT";

  // Track which groups are open — default: all open
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    navGroups.forEach((g) => { initial[g.labelAr] = true; });
    return initial;
  });

  // Keep the active group open when navigating
  useEffect(() => {
    navGroups.forEach((g) => {
      if (g.items.some((item) => isActive(pathname, item.href, isAchievementContext))) {
        setOpenGroups((prev) => ({ ...prev, [g.labelAr]: true }));
      }
    });
  }, [pathname, isAchievementContext]);

  function toggleGroup(label) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (collapsed) {
    return (
      <div className="relative z-10 flex flex-col h-full text-white">
        {/* Logo — icon only */}
        <div className="h-20 flex items-center justify-center border-b border-[#A48E68]/20">
          <div className="relative w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-[#A48E68]/30 animate-pulse-gold">
            <Image src="/logo.png" alt="شعار" fill sizes="44px" className="object-contain p-1" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-2">
          <ul className="space-y-1.5">
            {navGroups.flatMap((g) => g.items).filter(isVisible).map((item) => {
              const active = isActive(pathname, item.href, isAchievementContext);
              if (item.comingSoon) {
                return (
                  <li key={item.href}>
                    <div
                      title={`${item.labelAr} — قريباً`}
                      className="relative flex items-center justify-center p-3 rounded-xl opacity-40 cursor-not-allowed"
                    >
                      <item.icon className="w-5 h-5 shrink-0 text-gray-400" />
                      <span className="absolute -top-1 -left-1 text-[7px] font-black bg-[#A48E68] text-[#003D33] px-1 rounded-full leading-tight">
                        قريباً
                      </span>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.labelAr}
                    className={`flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${
                      active
                        ? "bg-[#A48E68] text-[#003D33]"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-[#A48E68]/20 space-y-1.5">
          <Link
            href="/"
            target="_blank"
            title="عرض الموقع"
            className="flex w-full items-center justify-center py-3 bg-[#A48E68]/15 border border-[#A48E68]/30 text-[#b9a779] hover:text-white hover:bg-[#A48E68]/30 hover:border-[#b9a779]/60 transition-all rounded-xl shadow-sm"
          >
            <Globe className="w-5 h-5 shrink-0" />
          </Link>
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="flex w-full items-center justify-center py-3 text-gray-400 hover:text-white hover:bg-white/10 transition-all rounded-xl"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col h-full text-white">
      {/* Bottom MOC decoration */}
      <div className="absolute bottom-14 left-0 right-0 h-16 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 moc-header-bar opacity-[0.15]" style={{ backgroundSize: "auto 100%" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#003D33] via-[#003D33]/80 to-transparent pointer-events-none" />
      </div>

      {/* Logo */}
      <div className="h-20 flex items-center justify-center border-b border-[#A48E68]/20 px-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center p-1.5 shadow-lg ring-2 ring-[#A48E68]/30 shrink-0 animate-pulse-gold">
            <Image src="/logo.png" alt="شعار وزارة الثقافة" fill sizes="48px" className="object-contain p-1.5" />
          </div>
          <div>
            <span className="font-bold gradient-text text-sm whitespace-nowrap block">نظام إدارة المحتوى</span>
            <span className="text-xs text-gray-300 whitespace-nowrap block">وزارة الثقافة</span>
          </div>
        </div>
      </div>

      {/* Gold arabesque divider */}
      <div className="px-5 pt-3 pb-1 flex items-center gap-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#A48E68]/30" />
        <div className="w-1.5 h-1.5 bg-[#A48E68]/50 rotate-45 shrink-0" />
        <div className="w-1 h-1 bg-[#A48E68]/30 rotate-45 shrink-0" />
        <div className="w-1.5 h-1.5 bg-[#A48E68]/50 rotate-45 shrink-0" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#A48E68]/30" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 hide-scrollbar">
        {navGroups.map((group) => {
          const visible = group.items.filter(isVisible);
          if (!visible.length) return null;
          const isOpen = openGroups[group.labelAr] ?? true;
          const hasActive = visible.some((item) => isActive(pathname, item.href, isAchievementContext));

          return (
            <div key={group.labelAr} className="mb-2">
              {/* Group header — clickable to collapse/expand */}
              <button
                onClick={() => toggleGroup(group.labelAr)}
                className="w-full mb-1 px-4 flex items-center gap-2 group cursor-pointer hover:opacity-100 transition-opacity"
              >
                <div className="w-1 h-1 bg-[#A48E68]/50 rotate-45 shrink-0" />
                <span className="text-[10px] text-[#A48E68]/60 font-bold uppercase tracking-wider flex-1 text-start">
                  {group.labelAr}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-[#A48E68]/50 group-hover:text-[#A48E68] transition-transform duration-300 ${
                    isOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>

              {/* Collapsible items */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isOpen ? `${visible.length * 56}px` : "0px", opacity: isOpen ? 1 : 0 }}
              >
                <ul className="space-y-1 pb-2">
                  {visible.map((item) => {
                    const active = isActive(pathname, item.href, isAchievementContext);
                    if (item.comingSoon) {
                      return (
                        <li key={item.href}>
                          <div
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-not-allowed opacity-50 select-none"
                            title="قريباً"
                          >
                            <item.icon className="w-4.5 h-4.5 shrink-0 text-gray-500" size={18} />
                            <span className="text-sm whitespace-nowrap text-gray-400">{item.labelAr}</span>
                            <span className="mr-auto text-[9px] font-black bg-[#A48E68]/20 text-[#A48E68] border border-[#A48E68]/30 px-1.5 py-0.5 rounded-full tracking-wide">
                              قريباً
                            </span>
                          </div>
                        </li>
                      );
                    }
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onLinkClick}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                            active
                              ? "bg-[#A48E68] text-[#003D33] font-bold shadow-lg"
                              : "text-gray-300 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {active && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#003D33] rounded-l-full" />
                          )}
                          <item.icon
                            className={`w-4.5 h-4.5 shrink-0 ${
                              active ? "text-[#003D33]" : "text-gray-400 group-hover:text-[#A48E68]"
                            }`}
                            size={18}
                          />
                          <span className="text-sm whitespace-nowrap">{item.labelAr}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#A48E68]/20 relative z-10">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-l from-[#A48E68]/15 to-[#b9a779]/20 hover:from-[#A48E68]/30 hover:to-[#b9a779]/35 border border-[#A48E68]/40 hover:border-[#b9a779]/70 text-[#EDE5D6] hover:text-white transition-all duration-300 rounded-xl group mb-2 shadow-sm font-semibold"
        >
          <Globe className="w-4.5 h-4.5 shrink-0 text-[#b9a779] group-hover:text-white group-hover:rotate-12 transition-all duration-300" />
          <span className="text-sm whitespace-nowrap">عرض الموقع</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-xl group"
        >
          <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm whitespace-nowrap">تسجيل الخروج</span>
        </button>
        <p className="text-[10px] text-[#A48E68]/80 text-center mt-3 leading-relaxed font-medium">
          مديرية التقانة والتحول الرقمي
        </p>
      </div>
    </div>
  );
}
