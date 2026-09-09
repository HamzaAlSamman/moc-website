"use client";

import React from "react";
import Link from "next/link";
import { translations } from "../data/translations";
import { toWesternNums } from "../lib/numbers";
import PostArtwork from "./PostArtwork";

function formatNewsDate(dateStr, isRtl) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year  = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day   = String(d.getUTCDate()).padStart(2, "0");
  const hours = d.getUTCHours();
  const mins  = String(d.getUTCMinutes()).padStart(2, "0");
  const h12   = String(hours % 12 || 12).padStart(2, "0");
  if (isRtl) {
    const period = hours >= 12 ? "م" : "ص";
    return `${year}-${month}-${day} ${period} ${h12}:${mins}`;
  }
  const period = hours >= 12 ? "PM" : "AM";
  return `${year}-${month}-${day} ${period} ${h12}:${mins}`;
}

export default function NewsCard({ article, locale }) {
  const t = translations[locale]?.common || translations.ar.common;
  const isRtl = locale !== "en";

  const title = isRtl ? article.titleAr : article.titleEn;
  const summary = isRtl ? article.summaryAr : article.summaryEn;
  const dateDisplay = toWesternNums(formatNewsDate(article.publishedAt || article.date, isRtl));

  return (
    <Link
      href={`/${locale}/news/${article.slug || article.id}`}
      className="group overflow-hidden h-full rounded-xl border border-slate-100 bg-white shadow-md flex flex-col transition-transform hover:scale-[1.03] w-full cursor-pointer"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Image Wrap */}
      <div className="relative h-56 min-w-[40%]">
        <PostArtwork
          src={article.image || article.featuredImage}
          alt={title || ""}
          fill
          sizes="(max-width: 768px) 100vw, 40vw"
          imageClassName="transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

        {/* Floating Category/Platform Indicator */}
        <div className={`absolute top-2 ${isRtl ? "right-2" : "left-2"} z-2 bg-white text-xs text-[#6B6B6B] font-semibold px-2 py-1 rounded-full shadow flex items-center gap-1.5`}>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          <span>{isRtl ? "ثقافي" : "Cultural"}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex flex-col grow">
        
        {/* Title */}
        <h3 className="text-lg flex-1 font-semibold text-[#054239] font-qomra text-start line-clamp-2 min-h-[3.25rem] group-hover:text-[#b9a779] transition-colors duration-300">
          {title}
        </h3>

        {/* Summary Description */}
        <p className="text-sm text-slate-500 mt-1 line-clamp-3 text-start leading-relaxed font-normal">
          {summary}
        </p>

        {/* Card Footer Info */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
          {/* Date */}
          <span className="text-slate-400 text-xs font-semibold">
            {dateDisplay}
          </span>

          {/* Read More link */}
          <span className="text-xs font-bold text-[#054239] group-hover:text-[#b9a779] transition-colors flex items-center gap-1">
            <span>{t.readMore}</span>
            <span className={`inline-block transition-transform duration-300 ${isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}>
              {isRtl ? "←" : "→"}
            </span>
          </span>
        </div>

      </div>
    </Link>
  );
}
