"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import NewsCard from "../../../components/NewsCard";
import DateRangePicker from "../../../components/DateRangePicker";
import { translations } from "../../../data/translations";
import DecorativeCorners from "../../../components/DecorativeCorners";
import { useSettings } from "../../../components/SettingsContext";
import SubpageHero from "../../../components/SubpageHero";

// Client view: receives the published news list from the server page and keeps
// all the interactive search / date-filter / pagination behaviour. Data is no
// longer fetched here — it arrives server-rendered in the initial HTML.
export default function NewsListView({ news = [], locale }) {
  const t = translations[locale]?.common || translations.ar.common;
  const isRtl = locale === "ar";
  const { postsPerPage: ITEMS_PER_PAGE } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, dateRange]);

  const newsData = news.map((a) => ({ ...a, image: a.featuredImage || "/images/cultural-principle1.jpg" }));

  const filteredNews = newsData.filter((article) => {
    const title = isRtl ? article.titleAr : article.titleEn;
    const summary = isRtl ? article.summaryAr : article.summaryEn;

    const matchesSearch =
      !searchQuery ||
      title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = (() => {
      if (!dateRange.start) return true;
      const d = new Date(article.publishedAt || article.date);
      if (isNaN(d)) return true;
      const start = new Date(dateRange.start); start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end || dateRange.start); end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    })();

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
  const paginatedNews = filteredNews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
      {/* Subpage Hero Header */}
      <SubpageHero
        title={t.news}
        subtitle={isRtl ? "وزارة الثقافة السورية" : "Syrian Ministry of Culture"}
        isRtl={isRtl}
      >
        {/* Search + Date filter row */}
        <div className="w-full max-w-2xl mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3" dir={isRtl ? "rtl" : "ltr"}>
          {/* Search input */}
          <div className="w-full flex-1 relative flex items-center bg-white/[0.07] hover:bg-white/[0.12] focus-within:bg-white/[0.15] backdrop-blur-lg border border-[#b9a779]/45 hover:border-[#b9a779] focus-within:border-[#b9a779] rounded-full px-4 py-2 transition-all duration-300 shadow-sm focus-within:shadow-[0_0_18px_rgba(185,167,121,0.25)]">
            <div className="flex-grow flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24"
                strokeWidth={2} stroke="currentColor"
                className="w-5 h-5 text-[#b9a779] shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder={isRtl ? "ابحث عن أخبار وتحديثات..." : "Search for news and updates..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dir={isRtl ? "rtl" : "ltr"}
                className="w-full bg-transparent border-none outline-none text-white text-sm placeholder-[#EDE5D6]/70 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[#EDE5D6]/50 hover:text-white transition-colors p-0.5 shrink-0"
                  title={isRtl ? "مسح البحث" : "Clear search"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Date range picker */}
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            locale={locale}
          />
        </div>
      </SubpageHero>

      {/* News Listings Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {filteredNews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedNews.map((article) => (
                <div key={article.id} className="h-full">
                  <NewsCard article={article} locale={locale} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-14" dir="ltr">
                {/* Prev */}
                <button
                  onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-[#b9a779]/40 text-[#b9a779] hover:bg-[#b9a779]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Previous page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-[#b9a779]/60 text-sm">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => { setCurrentPage(item); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`w-10 h-10 flex items-center justify-center rounded-full number-circle text-sm font-semibold transition-all ${
                          currentPage === item
                            ? "bg-[#054239] text-white shadow-md"
                            : "border border-[#b9a779]/40 text-[#054239] hover:bg-[#b9a779]/10"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                {/* Next */}
                <button
                  onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-[#b9a779]/40 text-[#b9a779] hover:bg-[#b9a779]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Next page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}

            {/* Page info */}
            {totalPages > 1 && (
              <p className="text-center text-sm text-[#b9a779]/70 mt-4">
                {isRtl
                  ? `الصفحة ${currentPage} من ${totalPages}`
                  : `Page ${currentPage} of ${totalPages}`}
              </p>
            )}
          </>
        ) : (
          <div className="w-full max-w-md mx-auto text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 relative overflow-hidden shadow-sm">
            <DecorativeCorners />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-[#988561]/60 mx-auto mb-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <h3 className="text-[#054239] font-bold text-lg mb-2">
              {isRtl ? "لم يتم العثور على أي نتائج" : "No results found"}
            </h3>
            <p className="text-slate-650 text-sm">
              {isRtl ? "يرجى التحقق من صياغة البحث أو استخدام كلمات مفتاحية أخرى." : "Please check your spelling or use different keywords."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
