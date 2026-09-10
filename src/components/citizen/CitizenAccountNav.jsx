"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function CitizenAccountNav({ locale = "ar" }) {
  const pathname = usePathname(); const router = useRouter(); const isAr = locale === "ar";
  const items = [["profile", isAr ? "الحساب" : "Account"], ["identity", isAr ? "الهوية" : "Identity"], ["bookings", isAr ? "حجوزاتي" : "Bookings"], ["copyright", isAr ? "حقوق المؤلف" : "Copyright"], ["legal-licenses", isAr ? "التراخيص القانونية" : "Legal Licenses"]];
  async function logout() { await fetch("/api/citizen/auth/logout", { method: "POST" }); router.push(`/${locale}/account/login`); router.refresh(); }
  return <nav className="mb-7 flex flex-wrap gap-2 border-b border-slate-100 pb-5" aria-label={isAr ? "تنقل حساب المواطن" : "Citizen account navigation"}>{items.map(([slug, label]) => <Link key={slug} href={`/${locale}/account/${slug}`} className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] ${pathname.includes(`/account/${slug}`) ? "bg-[#003D33] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</Link>)}<button type="button" onClick={logout} className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300">{isAr ? "تسجيل الخروج" : "Sign out"}</button></nav>;
}
