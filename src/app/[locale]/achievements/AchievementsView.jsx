"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { translations } from "../../../data/translations";
import DecorativeCorners from "../../../components/DecorativeCorners";
import AchievementCarousel from "../../../components/AchievementCarousel";
import { monthNamesAr, monthNamesEn, getTagColor } from "@/lib/achievements";
import SubpageHero from "../../../components/SubpageHero";

/* ──────────────────────────────────────────────────────────── */
/* Helpers                                                       */
/* ──────────────────────────────────────────────────────────── */


function parseGallery(raw, locale) {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const list = locale === "en" ? (parsed.en?.length ? parsed.en : parsed.ar || []) : (parsed.ar || []);
      return list.map((item) =>
        typeof item === "string"
          ? { url: item, type: "image" }
          : { url: item.url, type: item.type || "image" }
      );
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) =>
      typeof item === "string"
        ? { url: item, type: "image" }
        : { url: item.url, type: item.type || "image" }
    );
  } catch {
    return [];
  }
}

/* ──────────────────────────────────────────────────────────── */

export default function AchievementsView({ posts = [], locale }) {
  const isRtl = locale === "ar";

  const [activeYear, setActiveYear] = useState("all");
  const [activeMonthKey, setActiveMonthKey] = useState("all");
  const [search, setSearch] = useState("");

  // Group achievements by month/year during render (useMemo, not useEffect) so
  // the grouped content is produced during server rendering too — useEffect only
  // runs on the client, which would leave the SSR HTML empty.
  const months = useMemo(() => {
    const data = Array.isArray(posts) ? posts : [];

    const grouped = {};
    data.forEach((post) => {
      const d = new Date(post.publishedAt || post.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!grouped[key]) grouped[key] = { monthIdx: d.getMonth(), year: d.getFullYear(), items: [] };
      grouped[key].items.push(post);
    });

    return Object.values(grouped)
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.monthIdx - a.monthIdx)
      .map((g) => ({
        key:      `${g.year}-${g.monthIdx}`,
        monthIdx: g.monthIdx,
        name:     monthNamesAr[g.monthIdx],
        nameEn:   monthNamesEn[g.monthIdx],
        year:     String(g.year),
        achievements: g.items.map((p) => ({
          title:   p.titleAr,
          titleEn: p.titleEn || p.titleAr,
          desc:    p.summaryAr || "",
          descEn:  p.summaryEn || "",
          tag:     p.category?.nameAr || "",
          tagEn:   p.category?.nameEn || "",
          image:   p.featuredImage || null,
          gallery: parseGallery(p.gallery, locale),
        })),
      }));
  }, [locale, posts]);

  const years = useMemo(
    () => [...new Set(months.map((m) => parseInt(m.year, 10)))].sort((a, b) => b - a),
    [months]
  );

  const handleYearChange = (yrVal) => {
    setActiveYear(yrVal);
    setActiveMonthKey("all");
  };

  const allItems = months.flatMap((m) =>
    m.achievements.map((item) => ({ ...item, monthKey: m.key, year: parseInt(m.year, 10) }))
  );

  const filtered = allItems.filter((item) => {
    const matchYear  = activeYear === "all" || item.year === activeYear;
    const matchMonth = activeMonthKey === "all" || item.monthKey === activeMonthKey;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (isRtl ? item.title : item.titleEn).toLowerCase().includes(q) ||
      (isRtl ? item.desc  : item.descEn ).toLowerCase().includes(q) ||
      (isRtl ? item.tag   : item.tagEn  ).toLowerCase().includes(q);
    return matchYear && matchMonth && matchSearch;
  });

  const yearTabs = [
    { val: "all", name: "كل السنوات", nameEn: "All Years" },
    ...years.map((y) => ({ val: y, name: String(y), nameEn: String(y) }))
  ];

  const monthTabs = [
    { key: "all", name: "كل الأشهر", nameEn: "All Months" },
    ...months.filter((m) => activeYear === "all" || parseInt(m.year, 10) === activeYear)
  ];

  const totalCount = allItems.length;



  return (
    <div
      className="flex flex-col w-full min-h-screen bg-[#FBF9F6] pt-[84px] md:pt-[88px] lg:pt-[104px]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ── Hero ── */}
      <SubpageHero
        title={isRtl ? "إنجازات وزارة الثقافة" : "Ministry Achievements"}
        subtitle={isRtl ? "وزارة الثقافة السورية" : "Syrian Ministry of Culture"}
        isRtl={isRtl}
      >
        {/* Search box */}
        {months.length > 0 && (
          <div className="w-full max-w-xs sm:max-w-md mt-1 sm:mt-4 relative flex items-center bg-white/[0.07] hover:bg-white/[0.12] focus-within:bg-white/[0.15] backdrop-blur-lg border border-[#b9a779]/45 hover:border-[#b9a779] focus-within:border-[#b9a779] rounded-full px-3 py-2 sm:px-4 sm:py-2.5 transition-all duration-300 shadow-sm focus-within:shadow-[0_0_18px_rgba(185,167,121,0.25)]">
            <div className="flex-grow flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#b9a779] shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder={isRtl ? "ابحث في الإنجازات..." : "Search achievements..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                dir={isRtl ? "rtl" : "ltr"}
                className="w-full bg-transparent border-none outline-none text-white text-sm placeholder-[#EDE5D6]/60 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-[#EDE5D6]/50 hover:text-white transition-colors p-0.5 shrink-0 cursor-pointer"
                  aria-label="Clear"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </SubpageHero>

      {/* ── Filters ── */}
      {months.length > 0 && (
        <section className="bg-[#FBF9F6] border-b border-[#A48E68]/15 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex flex-col gap-2.5 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">

            {/* Controls row */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Year pills - horizontal scroll on mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 select-none whitespace-nowrap shrink-0">
                  {isRtl ? "السنة:" : "Year:"}
                </span>
                {yearTabs.map((yr) => (
                  <button
                    key={yr.val}
                    onClick={() => handleYearChange(yr.val)}
                    className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border transition-all duration-200 cursor-pointer ${
                      activeYear === yr.val
                        ? "bg-[#054239] text-[#EDE5D6] border-[#054239] shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#b9a779]/45 hover:text-[#054239]"
                    }`}
                  >
                    {isRtl ? yr.name : yr.nameEn}
                  </button>
                ))}
              </div>

              {/* Separator */}
              <div className="hidden sm:block w-px h-5 bg-[#A48E68]/20" />

              {/* Month dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold text-gray-400 select-none whitespace-nowrap shrink-0">
                  {isRtl ? "الشهر:" : "Month:"}
                </span>
                <div className="relative">
                  <select
                    value={activeMonthKey}
                    onChange={(e) => setActiveMonthKey(e.target.value)}
                    className={`w-28 sm:w-44 bg-white border border-gray-200 text-[#054239] rounded-lg py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold transition-all duration-200 focus:outline-none focus:border-[#b9a779] focus:ring-1 focus:ring-[#b9a779] cursor-pointer appearance-none ${
                      isRtl ? "pl-6 pr-2.5 text-right" : "pr-6 pl-2.5 text-left"
                    }`}
                  >
                    <option value="all">{isRtl ? "كل الأشهر" : "All Months"}</option>
                    {activeYear === "all" ? (
                      years.map((y) => {
                        const yearMonths = months.filter((m) => parseInt(m.year, 10) === y);
                        if (yearMonths.length === 0) return null;
                        return (
                          <optgroup key={y} label={String(y)}>
                            {yearMonths.map((m) => (
                              <option key={m.key} value={m.key}>
                                {isRtl ? m.name : m.nameEn}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    ) : (
                      months
                        .filter((m) => parseInt(m.year, 10) === activeYear)
                        .map((m) => (
                          <option key={m.key} value={m.key}>
                            {isRtl ? m.name : m.nameEn}
                          </option>
                        ))
                    )}
                  </select>
                  <div className={`absolute inset-y-0 ${isRtl ? "left-2" : "right-2"} flex items-center pointer-events-none text-gray-400`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>



          </div>
        </section>
      )}

      {/* ── Content Grid ── */}
      <section className="py-6 sm:py-10 lg:py-14 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">

        {months.length === 0 ? (
          /* Empty state */
          <div className="w-full max-w-sm sm:max-w-lg mx-auto text-center py-16 px-6 sm:px-8 bg-white/60 backdrop-blur-md rounded-3xl border border-[#A48E68]/20 shadow-lg relative overflow-hidden flex flex-col items-center gap-4 mt-6">
            <DecorativeCorners />
            <div className="w-16 h-16 rounded-full bg-[#A48E68]/15 text-[#988561] flex items-center justify-center text-3xl animate-pulse">
              ✨
            </div>
            <h3 className="text-[#002723] font-black text-xl font-sans">
              {isRtl ? "قريباً" : "Coming Soon"}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              {isRtl
                ? "تجري حالياً أرشفة وتوثيق إنجازات الوزارة وعرضها هنا قريباً."
                : "The Ministry's achievements are currently being documented and will be displayed here soon."}
            </p>
          </div>

        ) : filtered.length === 0 ? (
          /* No results */
          <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-3">
            <p className="text-5xl">🔍</p>
            <p className="font-bold text-gray-600 text-base">
              {isRtl ? "لا توجد نتائج مطابقة" : "No results found"}
            </p>
            <button
              onClick={() => { setSearch(""); setActiveYear("all"); setActiveMonthKey("all"); }}
              className="mt-2 text-xs text-[#A48E68] hover:text-[#002723] font-bold underline underline-offset-2 cursor-pointer"
            >
              {isRtl ? "إعادة تعيين الفلاتر" : "Reset filters"}
            </button>
          </div>

        ) : activeMonthKey === "all" ? (
          /* Grouped by month */
          months.map((m) => {
            const isMonthMatch = activeYear === "all" || parseInt(m.year, 10) === activeYear;
            if (!isMonthMatch) return null;
            const monthItems = filtered.filter((i) => i.monthKey === m.key);
            if (!monthItems.length) return null;
            const isSingle = monthItems.length === 1;

            return (
              <div key={m.key} className="mb-8 sm:mb-14">
                {/* Month heading */}
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rotate-45 bg-[#988561] shrink-0" />
                  <h2 className="text-[#002723] font-black text-sm sm:text-xl">
                    {isRtl
                      ? `إنجازات شهر ${m.name} ${m.year}`
                      : `${m.nameEn} ${m.year} Achievements`}
                  </h2>
                  <span className="flex-1 h-px bg-gradient-to-r from-[#A48E68]/30 to-transparent" />
                </div>

                {/* Cards grid */}
                <div className={isSingle
                  ? "flex justify-center"
                  : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6"
                }>
                  {monthItems.map((item, idx) => (
                    <AchievementCard
                      key={idx}
                      item={item}
                      idx={idx}
                      isRtl={isRtl}
                      isSingle={isSingle}
                    />
                  ))}
                </div>
              </div>
            );
          })

        ) : (
          /* Filtered by specific month */
          <div className={filtered.length === 1
            ? "flex justify-center"
            : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6"
          }>
            {filtered.map((item, idx) => (
              <AchievementCard
                key={idx}
                item={item}
                idx={idx}
                isRtl={isRtl}
                isSingle={filtered.length === 1}
              />
            ))}
          </div>
        )}

        {/* Back to home */}
        <div className="mt-10 sm:mt-16 text-center">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-[#A48E68] hover:text-[#002723] font-bold text-xs sm:text-sm transition-colors"
          >
            {isRtl ? (
              <><span>←</span><span>العودة للصفحة الرئيسية</span></>
            ) : (
              <><span>Back to Home</span><span>→</span></>
            )}
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Achievement Card                                              */
/* ──────────────────────────────────────────────────────────── */

function AchievementCard({ item, idx, isRtl, isSingle }) {
  const hasText = item.title && !item.title.startsWith("أبرز أعمال") && !item.title.startsWith("Highlights");

  return (
    <div
      className={`group relative flex flex-col rounded-xl sm:rounded-2xl overflow-hidden border border-[#A48E68]/15 bg-white
        hover:border-[#988561] hover:shadow-xl hover:shadow-[#054239]/5
        transition-all duration-300 ${isSingle ? "w-full max-w-[280px] sm:max-w-[500px] mx-auto" : ""}`}
    >
      {/* Media Section */}
      <div className="relative w-full overflow-hidden">
        <AchievementCarousel
          items={item.gallery}
          fallbackImage={item.image || `/images/cultural-principle${(idx % 7) + 1}.jpg`}
          alt={isRtl ? item.title : item.titleEn}
          sizes={
            isSingle
              ? "(max-width:640px) 280px, 500px"
              : "(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          }
          isRtl={isRtl}
          aspectRatio="4/5"
          overlay={
            <>
              {/* Mobile: show title overlay on image */}
              {hasText && (
                <div className="sm:hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none" />
                  <div className="absolute bottom-0 inset-x-0 z-10 p-2.5 pointer-events-none">
                    {item.tag && item.tag !== "ثقافي" && (
                      <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full border mb-1 ${getTagColor(item.tagEn)}`}>
                        {isRtl ? item.tag : item.tagEn}
                      </span>
                    )}
                    <h3 className="text-white font-black text-[11px] leading-tight font-sans line-clamp-2">
                      {isRtl ? item.title : item.titleEn}
                    </h3>
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>

      {/* Desktop: Text section below image */}
      {hasText && (
        <div className="hidden sm:flex p-4 sm:p-5 flex-grow flex-col gap-2">
          {/* Tag */}
          {item.tag && item.tag !== "ثقافي" && (
            <span className={`self-start text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border ${getTagColor(item.tagEn)}`}>
              {isRtl ? item.tag : item.tagEn}
            </span>
          )}

          {/* Title */}
          <h3 className="text-[#054239] font-black text-sm sm:text-base leading-snug font-sans line-clamp-2 hover:text-[#988561] transition-colors duration-200">
            {isRtl ? item.title : item.titleEn}
          </h3>

          {/* Description */}
          {item.desc && (
            <p className="text-gray-600 text-xs leading-relaxed line-clamp-3">
              {isRtl ? item.desc : item.descEn}
            </p>
          )}
        </div>
      )}

      {/* Bottom accent line */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#b9a779] to-[#988561] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />
    </div>
  );
}