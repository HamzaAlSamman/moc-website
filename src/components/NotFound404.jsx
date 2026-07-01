"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Professional, MOC-branded 404 view. Rendered by the not-found.js boundaries
 * (which sit inside the [locale] layout, so the site Header/Footer wrap it).
 * not-found.js receives no props, so locale is read from the pathname.
 */
export default function NotFound404() {
  const pathname = usePathname() || "/ar";
  const seg = pathname.split("/").filter(Boolean)[0];
  const locale = seg === "en" ? "en" : "ar";
  const isRtl = locale === "ar";

  const t = isRtl
    ? {
        code: "404",
        title: "الصفحة غير موجودة",
        desc: "عذراً، الصفحة التي تبحث عنها قد تكون حُذفت أو نُقلت، أو أن الرابط غير صحيح. تأكّد من العنوان أو عُد إلى الصفحة الرئيسية.",
        home: "العودة إلى الرئيسية",
        news: "تصفّح الأخبار",
        services: "الخدمات الإلكترونية",
        hint: "إن وصلت إلى هنا عبر رابط من الموقع، فقد يكون المحتوى قد نُقل.",
      }
    : {
        code: "404",
        title: "Page Not Found",
        desc: "Sorry, the page you are looking for may have been removed, moved, or the link is incorrect. Check the address or return to the homepage.",
        home: "Back to Home",
        news: "Browse News",
        services: "Digital Services",
        hint: "If you reached this page from a link on our site, the content may have moved.",
      };

  return (
    <div
      className="relative min-h-[80vh] flex flex-col bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px] overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Brand bar */}
      <div className="h-1 bg-gradient-to-r from-[#054239] via-[#b9a779] to-[#054239]" />

      {/* Subtle pattern backdrop */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "90px", backgroundRepeat: "repeat" }}
      />

      <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-5 py-16">
        {/* 404 code with diamond accents */}
        <div className="flex items-center gap-4 mb-2">
          <span className="w-2.5 h-2.5 bg-[#b9a779] rotate-45 inline-block shrink-0" />
          <h1 className="font-qomra font-black text-7xl sm:text-8xl lg:text-9xl text-[#054239] leading-none tracking-tight tabular-nums">
            {t.code}
          </h1>
          <span className="w-2.5 h-2.5 bg-[#b9a779] rotate-45 inline-block shrink-0" />
        </div>

        <div className="w-16 h-[2.5px] bg-[#b9a779] my-6" />

        <h2 className="font-qomra font-extrabold text-2xl sm:text-3xl text-[#002723] mb-4">
          {t.title}
        </h2>

        <p className="max-w-md text-slate-500 text-sm sm:text-base leading-relaxed mb-9">
          {t.desc}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#002723] px-7 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#054239] hover:shadow-md border-b-2 border-[#b9a779]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
            </svg>
            {t.home}
          </Link>
          <Link
            href={`/${locale}/news`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#054239]/15 bg-white px-7 py-3 text-sm font-bold text-[#054239] shadow-sm transition-all hover:border-[#b9a779]/50 hover:bg-[#b9a779]/5"
          >
            {t.news}
          </Link>
          <Link
            href={`/${locale}/services`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#054239]/15 bg-white px-7 py-3 text-sm font-bold text-[#054239] shadow-sm transition-all hover:border-[#b9a779]/50 hover:bg-[#b9a779]/5"
          >
            {t.services}
          </Link>
        </div>

        <p className="mt-10 text-xs text-slate-400 max-w-sm leading-relaxed">{t.hint}</p>
      </div>
    </div>
  );
}
