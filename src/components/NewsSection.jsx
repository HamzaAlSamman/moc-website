"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import NewsCard from "./NewsCard";
import { translations } from "../data/translations";

export default function NewsSection({ locale }) {
  const t = translations[locale]?.common || translations.ar.common;
  const isRtl = locale !== "en";
  const [loaded, setLoaded] = useState(false);
  const [newsData, setNewsData] = useState([]);

  useEffect(() => {
    setLoaded(false);
    const timer = setTimeout(() => setLoaded(true), 150);
    return () => clearTimeout(timer);
  }, [locale]);

  useEffect(() => {
    fetch("/api/posts?type=NEWS&limit=6")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setNewsData(data))
      .catch(() => {});
  }, []);

  // The live site displays 6 news cards on the homepage
  const latestNews = newsData.map((a) => ({ ...a, image: a.featuredImage || "/images/cultural-principle1.jpg" }));

  return (
    <section 
      className="w-full bg-white py-12 md:py-20 scroll-mt-28" 
      id="news"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="container mx-auto px-6 md:px-16">
        <div className="flex flex-col gap-10">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="space-y-2 text-start">
              <h2 className="text-2xl md:text-3xl font-medium text-foreground">
                {isRtl ? "آخر الأخبار" : "Latest News"}
              </h2>
              <div className="w-20 h-1 bg-primary rounded-full" />
            </div>

            <Link
              href={`/${locale}/news`}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-9 px-4 text-xs font-semibold py-1 cursor-pointer"
            >
              <span>{isRtl ? "المزيد من الأخبار" : "See More News"}</span>
              <span className={`transition-transform duration-300 ${isRtl ? "group-hover:-translate-x-1.5" : "group-hover:translate-x-1.5"}`}>
                {isRtl ? "←" : "→"}
              </span>
            </Link>
          </div>

          {/* News Grid (6 Cards) */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-[800ms] ${
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {latestNews.map((article, index) => (
              <div
                key={article.id}
                className="flex"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <NewsCard article={article} locale={locale} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
