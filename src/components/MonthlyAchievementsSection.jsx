"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DecorativeCorners from "./DecorativeCorners";
import AchievementCarousel from "./AchievementCarousel";
import { getTagColor } from "@/lib/achievements";

/* ── Parse gallery from JSON string ─────────────────── */
function parseGallery(raw, locale) {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // It's the new format: { ar: [...], en: [...] }
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

export default function MonthlyAchievementsSection({ locale }) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(null);
  const [activeMonthKey, setActiveMonthKey] = useState(null);
  const [displayMonthKey, setDisplayMonthKey] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [achievementsData, setAchievementsData] = useState({});
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const sectionRef = useRef(null);
  const tabsRef = useRef(null);
  const isRtl = locale !== "en";

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/posts?type=ACHIEVEMENT")
      .then((r) => r.json())
      .then((posts) => {
        if (!Array.isArray(posts)) {
          setIsLoading(false);
          return;
        }

        const monthNames = [
          { ar: "يناير",  en: "January"   },
          { ar: "فبراير", en: "February"  },
          { ar: "مارس",   en: "March"     },
          { ar: "أبريل",  en: "April"     },
          { ar: "مايو",   en: "May"       },
          { ar: "يونيو",  en: "June"      },
          { ar: "يوليو",  en: "July"      },
          { ar: "أغسطس",  en: "August"    },
          { ar: "سبتمبر", en: "September" },
          { ar: "أكتوبر", en: "October"   },
          { ar: "نوفمبر", en: "November"  },
          { ar: "ديسمبر", en: "December"  },
        ];

        const grouped = {};
        posts.forEach((post) => {
          const d = new Date(post.publishedAt || post.createdAt);
          const year = d.getUTCFullYear();
          const month = d.getUTCMonth() + 1;
          const key = `${year}-${month}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            gallery: parseGallery(post.gallery, locale),
            image:   post.featuredImage || "/images/cultural-principle1.jpg",
            title:   post.titleAr,
            titleEn: post.titleEn || post.titleAr,
            desc:    post.summaryAr || "",
            descEn:  post.summaryEn || "",
            tag:     post.category?.nameAr || "",
            tagEn:   post.category?.nameEn || "",
          });
        });

        setAchievementsData(grouped);

        // Build sorted list of year/month entries
        const entries = Object.keys(grouped).map((key) => {
          const [yearStr, monthStr] = key.split("-");
          return {
            key,
            year: parseInt(yearStr, 10),
            month: parseInt(monthStr, 10)
          };
        }).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

        const uniqueYears = [...new Set(entries.map((e) => e.year))].sort((a, b) => b - a);
        setYears(uniqueYears);

        const monthsList = entries.map((e) => ({
          key:    e.key,
          id:     e.month,
          year:   e.year,
          name:   monthNames[e.month - 1].ar,
          nameEn: monthNames[e.month - 1].en,
        }));
        setMonths(monthsList);

        if (uniqueYears.length > 0) {
          const latestYear = uniqueYears[0];
          setActiveYear(latestYear);
          
          const latestMonthOfLatestYear = monthsList.find(m => m.year === latestYear);
          if (latestMonthOfLatestYear) {
            setActiveMonthKey(latestMonthOfLatestYear.key);
            setDisplayMonthKey(latestMonthOfLatestYear.key);
          }
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [locale]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading]);

  const handleYearChange = (year) => {
    if (year === activeYear) return;
    setActiveYear(year);
    
    // Find the latest month for the new year
    const latestMonthOfNewYear = months.find((m) => m.year === year);
    if (latestMonthOfNewYear) {
      handleMonthKeyChange(latestMonthOfNewYear.key);
    }
  };

  const handleMonthKeyChange = (key) => {
    if (key === activeMonthKey || isAnimating) return;
    setIsAnimating(true);
    setActiveMonthKey(key);
    setTimeout(() => {
      setDisplayMonthKey(key);
      setIsAnimating(false);
    }, 240);

    const tabsEl = tabsRef.current;
    if (tabsEl) {
      const activeBtn = tabsEl.querySelector(`[data-month="${key}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  };

  const items = achievementsData[displayMonthKey] || [];
  const currentMonthObj = months.find((m) => m.key === activeMonthKey);

  if (isLoading) {
    return (
      <section
        ref={sectionRef}
        id="achievements"
        className="relative py-20 md:py-28 bg-[#F8F3EC] overflow-hidden scroll-mt-28"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "140px", backgroundRepeat: "repeat" }}
        />

        {/* Ambient orbs */}
        <div className="absolute top-0 start-1/4 w-96 h-96 bg-[#A48E68]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 end-1/4 w-64 h-64 bg-[#002723]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 md:px-16 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-14">
            <span className="inline-block text-[#A48E68] text-xs font-bold tracking-[0.2em] uppercase mb-5 border border-[#A48E68]/30 rounded-full px-5 py-1.5 bg-[#A48E68]/8">
              {isRtl ? "محدَّث شهريًا" : "Updated Monthly"}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002723] leading-tight font-sans">
              {isRtl ? "إنجازات وزارة الثقافة" : "Ministry Achievements"}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-5">
              <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#A48E68]" />
              <div className="w-2 h-2 rotate-45 bg-[#988561] shrink-0" />
              <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#A48E68]" />
            </div>
            <p className="text-[#475569] mt-4 max-w-lg mx-auto text-sm leading-relaxed font-medium">
              {isRtl
                ? "تابع أبرز ما تحقق على صعيد العمل الثقافي شهرًا بشهر"
                : "Follow the most notable cultural achievements month by month"}
            </p>
          </div>

          {/* Skeleton Months tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap md:justify-center gap-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 rounded-full bg-white border border-gray-200/60 animate-pulse flex items-center justify-center"
              >
                <div className="w-14 h-3 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>

          {/* Skeleton Label */}
          <div className="flex justify-center mb-8 h-6">
            <div className="w-40 h-4 bg-gray-250/20 rounded-md animate-pulse" />
          </div>

          {/* Skeleton Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-[#A48E68]/15 bg-white shadow-sm flex flex-col justify-end p-5 animate-pulse"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100" />
                
                {/* Content skeletons inside the card */}
                <div className="relative z-10 flex flex-col gap-2">
                  <div className="w-16 h-4 bg-gray-200/60 rounded-full" />
                  <div className="w-3/4 h-5 bg-gray-300 rounded-md" />
                  <div className="w-full h-3 bg-gray-200 rounded-md" />
                  <div className="w-5/6 h-3 bg-gray-200 rounded-md" style={{ width: "80%" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton Button */}
          <div className="mt-12 text-center">
            <div className="inline-flex w-44 h-12 rounded-full border border-gray-200 bg-white animate-pulse items-center justify-center">
              <div className="w-24 h-4 bg-gray-200 rounded-md" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (months.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="achievements"
      className="relative py-20 md:py-28 bg-[#F8F3EC] overflow-hidden scroll-mt-28"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "140px", backgroundRepeat: "repeat" }}
      />

      {/* Ambient orbs */}
      <div className="absolute top-0 start-1/4 w-96 h-96 bg-[#A48E68]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-1/4 w-64 h-64 bg-[#002723]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 md:px-16 relative z-10">

        {/* Section Header */}
        <div className={`text-center mb-14 ${sectionVisible ? "section-reveal" : "opacity-0"}`}>
          <span className="inline-block text-[#A48E68] text-xs font-bold tracking-[0.2em] uppercase mb-5 border border-[#A48E68]/30 rounded-full px-5 py-1.5 bg-[#A48E68]/8">
            {isRtl ? "محدَّث شهريًا" : "Updated Monthly"}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#002723] leading-tight font-sans">
            {isRtl ? "إنجازات وزارة الثقافة" : "Ministry Achievements"}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#A48E68]" />
            <div className="w-2 h-2 rotate-45 bg-[#988561] shrink-0" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#A48E68]" />
          </div>
          <p className="text-[#475569] mt-4 max-w-lg mx-auto text-sm leading-relaxed font-medium">
            {isRtl
              ? "تابع أبرز ما تحقق على صعيد العمل الثقافي شهرًا بشهر"
              : "Follow the most notable cultural achievements month by month"}
          </p>
        </div>

        {/* Year Selector Tabs */}
        {years.length > 1 && (
          <div
            className={`flex gap-3 justify-center mb-6 ${sectionVisible ? "card-reveal" : "opacity-0"}`}
            style={{ "--anim-delay": "100ms" }}
          >
            {years.map((yr) => {
              const isActive = activeYear === yr;
              return (
                <button
                  key={yr}
                  onClick={() => handleYearChange(yr)}
                  className={`px-6 py-2 rounded-xl text-sm font-black transition-all duration-300 border cursor-pointer ${
                    isActive
                      ? "text-[#EDE5D6] bg-[#988561] border-[#988561] shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#988561]/50 hover:text-[#002723]"
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        )}

        {/* Month Tabs */}
        <div
          ref={tabsRef}
          className={`grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap md:justify-center gap-2 mb-8 ${sectionVisible ? "card-reveal" : "opacity-0"}`}
          style={{ "--anim-delay": "150ms" }}
        >
          {months
            .filter((m) => m.year === activeYear)
            .map((month) => {
              const isActive = activeMonthKey === month.key;
              return (
                <button
                  key={month.key}
                  data-month={month.key}
                  onClick={() => handleMonthKeyChange(month.key)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border cursor-pointer ${
                    isActive
                      ? "text-[#EDE5D6] bg-[#002723] border-[#A48E68] shadow-md"
                      : "bg-white text-gray-500 border-gray-200 hover:border-[#A48E68]/45 hover:text-[#002723]"
                  }`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#988561] shrink-0 pulse-dot" />
                  )}
                  <span>{isRtl ? month.name : month.nameEn}</span>
                </button>
              );
            })}
        </div>

        {/* Current month label */}
        <div className="text-center mb-8 h-6">
          <span className="text-[#A48E68] text-sm font-bold">
            {isRtl
              ? `إنجازات شهر ${currentMonthObj?.name} ${currentMonthObj?.year}`
              : `${currentMonthObj?.nameEn} ${currentMonthObj?.year} Achievements`}
          </span>
        </div>

        {/* Achievement Cards — Instagram Carousel */}
        <div
          className={items.length === 1 ? "flex justify-center" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"}
          style={{
            transition: "opacity 0.22s ease, transform 0.22s ease",
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? "translateY(12px)" : "translateY(0)",
          }}
        >
          {items.map((item, idx) => (
            <div
              key={`${displayMonthKey}-${idx}`}
              className={`group relative rounded-2xl overflow-hidden border border-[#A48E68]/15
                hover:border-[#988561] hover:shadow-2xl hover:shadow-[#002723]/20
                transition-all duration-300 cursor-default
                ${items.length === 1 ? "w-full max-w-[500px]" : ""}
                ${sectionVisible ? "card-reveal" : "opacity-0"}`}
              style={{ "--anim-delay": `${300 + idx * 90}ms` }}
            >
              <AchievementCarousel
                items={item.gallery}
                fallbackImage={item.image}
                alt={isRtl ? item.title : item.titleEn}
                sizes={items.length === 1 ? "(max-width:640px) 100vw, 500px" : "(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"}
                isRtl={isRtl}
                aspectRatio="4/5"
                overlay={
                  <>
                    {/* Gradient overlay and content - only if title is valid and not auto-generated */}
                    {item.title && !item.title.startsWith("أبرز أعمال") && !item.title.startsWith("Highlights") ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#030705]/95 via-[#030705]/45 to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-0 z-10 flex flex-col justify-end p-5 pointer-events-none">
                          {item.tag && item.tag !== "ثقافي" && (
                            <span className={`self-start text-xs font-bold px-2.5 py-1 rounded-full border mb-3 ${getTagColor(item.tagEn)}`}>
                              {isRtl ? item.tag : item.tagEn}
                            </span>
                          )}
                          <h3 className="text-white font-black text-base leading-snug mb-2 font-sans">
                            {isRtl ? item.title : item.titleEn}
                          </h3>
                          {item.desc && (
                            <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">
                              {isRtl ? item.desc : item.descEn}
                            </p>
                          )}
                        </div>
                      </>
                    ) : null}
                  </>
                }
              />

              {/* Bottom accent line */}
              <div className="absolute bottom-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#A48E68] to-[#988561] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20" />
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className={`mt-12 text-center ${sectionVisible ? "card-reveal" : "opacity-0"}`} style={{ "--anim-delay": "600ms" }}>
          <Link
            href={`/${locale}/achievements`}
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full border border-[#A48E68]/50 text-[#002723] font-bold text-sm bg-white hover:bg-[#002723] hover:text-[#EDE5D6] hover:border-[#002723] transition-all duration-300 shadow-sm hover:shadow-lg group"
          >
            <span>{isRtl ? "عرض كل الإنجازات" : "View All Achievements"}</span>
            <span className={`text-[#A48E68] group-hover:text-[#A48E68] transition-transform duration-300 ${isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}>
              {isRtl ? "←" : "→"}
            </span>
          </Link>
        </div>

      </div>
    </section>
  );
}
