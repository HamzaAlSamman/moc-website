"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import BlockRenderer from "../../../../components/BlockRenderer";
import { toWesternNums } from "../../../../lib/numbers";

/* ── Extract all images: gallery first, then featured, then content imgs ── */
function extractImages(html = "", featuredImage = "", galleryJson = "") {
  const imgs = [];

  // 1. Gallery images (highest priority — explicitly added by editor)
  try {
    const gallery = JSON.parse(galleryJson || "[]");
    gallery.forEach((src) => src && !imgs.includes(src) && imgs.push(src));
  } catch {}

  // 2. Featured image
  if (featuredImage && !imgs.includes(featuredImage)) imgs.push(featuredImage);

  // 3. Images embedded in content HTML
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    if (src && !imgs.includes(src)) imgs.push(src);
  }

  return imgs.filter((s) => s && !s.match(/icon|logo|avatar|placeholder/i));
}

/* ── Format date like: 2026-04-15 م 09:30 ── */
function formatDate(dateStr, isRtl) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dy = String(d.getUTCDate()).padStart(2, "0");
  const h = d.getUTCHours();
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const h12 = String(h % 12 || 12).padStart(2, "0");
  const period = h >= 12 ? (isRtl ? "م" : "PM") : (isRtl ? "ص" : "AM");
  return `${y}-${mo}-${dy} ${period} ${h12}:${mi}`;
}

/* ── Image Slider ── */
function ImageSlider({ images, title }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  // Auto-rotate every 5 s — pause on hover
  useEffect(() => {
    if (images.length <= 1 || paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, images.length, paused]);

  // Keyboard navigation
  useEffect(() => {
    const h = (e) => { if (e.key === "ArrowLeft") next(); if (e.key === "ArrowRight") prev(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next]);

  if (!images.length) return null;

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden bg-slate-950 shadow-xl border border-[#b9a779]/20 select-none group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Main image container */}
      <div className="relative aspect-[16/9] w-full">
        <Image
          key={idx}
          src={images[idx]}
          alt={`${title} - ${idx + 1}`}
          fill
          unoptimized
          className="object-cover transition-opacity duration-500 ease-in-out"
          sizes="(max-width: 1280px) 100vw, 1280px"
          priority
        />
        {/* Gradient bottom overlay */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {/* Navigation arrows (Premium Glassmorphic) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute top-1/2 -translate-y-1/2 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 z-10 cursor-pointer"
              aria-label="Previous"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute top-1/2 -translate-y-1/2 left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 z-10 cursor-pointer"
              aria-label="Next"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators (floating centered overlay) */}
        {images.length > 1 && (
          <div className="absolute bottom-5 inset-x-0 flex justify-center gap-2.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === idx ? "bg-[#b9a779] w-7 shadow-[0_0_8px_#b9a779]" : "bg-white/40 w-2.5 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Article view (client) — receives all data as props; no data fetching ── */
export default function ArticleView({ post, latestNews = [], locale }) {
  const isRtl = locale === "ar";
  const { slug } = post;

  //  Fire-and-forget view counter, decoupled from the (cacheable) server render.
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/posts/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);

  const title = isRtl ? post.titleAr : (post.titleEn || post.titleAr);
  const content = isRtl ? post.contentAr : (post.contentEn || post.contentAr);
  const images = extractImages(content, post.featuredImage, post.gallery);

  // Attached PDF documents — array of { url, name }
  const attachments = (() => {
    try {
      const arr = JSON.parse(post.attachments || "[]");
      return Array.isArray(arr) ? arr.filter((a) => a && a.url) : [];
    } catch { return []; }
  })();

  return (
    <div className="min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── Brand Bar ── */}
      <div className="h-1 bg-gradient-to-r from-[#054239] via-[#b9a779] to-[#054239]" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 motion-safe:animate-[fadeInUp_0.6s_ease_both]">

        {/* ── Breadcrumb Navigation ── */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 mb-8 font-medium">
          <Link href={`/${locale}`} className="hover:text-[#054239] transition-colors">{isRtl ? "الرئيسية" : "Home"}</Link>
          <span className="text-slate-300">/</span>
          <Link href={`/${locale}/news`} className="hover:text-[#054239] transition-colors">{isRtl ? "الأخبار" : "News"}</Link>
          {post.category && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-[#b9a779] font-semibold">
                {isRtl ? post.category.nameAr : (post.category.nameEn || post.category.nameAr)}
              </span>
            </>
          )}
        </div>

        {/* ── Heading Block (Title, Category, Lead Paragraph) ── */}
        <div className="mb-8 max-w-4xl">
          {post.category?.nameAr && (
            <span className="inline-block mb-4 px-3.5 py-1 rounded-full bg-[#054239]/5 text-[#054239] text-xs font-bold border border-[#054239]/10 tracking-wide uppercase">
              {isRtl ? post.category.nameAr : (post.category.nameEn || post.category.nameAr)}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#054239] leading-relaxed mb-6 font-qomra">
            {title}
          </h1>

          {/* ── Date & Attached Links Metadata Row ── */}
          <div className="flex flex-wrap items-center gap-6 border-b border-slate-100 pb-5 mb-4">
            {/* Date */}
            {post.publishedAt && (
              <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#b9a779] shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span>{toWesternNums(formatDate(post.publishedAt, isRtl))}</span>
              </div>
            )}

            {/* Attached links */}
            {(post.facebookUrl || post.instagramUrl || post.twitterUrl || post.youtubeUrl) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">
                  {isRtl ? "روابط مرفقة:" : "Attached links:"}
                </span>
                {[
                  { url: post.facebookUrl, color: "#1877F2", title: "Facebook",
                    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg> },
                  { url: post.instagramUrl, color: "#E1306C", title: "Instagram",
                    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.5"/></svg> },
                  { url: post.twitterUrl, color: "#000", title: "X",
                    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                  { url: post.youtubeUrl, color: "#FF0000", title: "YouTube",
                    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                ].filter((s) => s.url).map(({ url, color, title: t, icon }) => (
                  <a key={t} href={url} target="_blank" rel="noopener noreferrer" title={t}
                    className="w-7 h-7 rounded-full flex items-center justify-center border transition-all hover:scale-115 active:scale-95 text-slate-400 hover:text-white bg-slate-50/50 hover:bg-opacity-100 shrink-0"
                    style={{ borderColor: color + "30" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = color;
                      e.currentTarget.style.borderColor = color;
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "";
                      e.currentTarget.style.borderColor = color + "30";
                      e.currentTarget.style.color = "";
                    }}
                  >
                    {icon}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Featured Media Hero (Single image or Gallery Slider) ── */}
        {images.length > 0 && (
          <div className="mb-12 shadow-sm">
            {images.length > 1 ? (
              <ImageSlider images={images} title={title} />
            ) : (
              <div className="w-full aspect-[16/9] relative rounded-3xl overflow-hidden bg-slate-900 border border-[#b9a779]/15 shadow-xl">
                <Image
                  src={images[0]}
                  alt={title}
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Main Content Area (Single Column) ── */}
        <div className="w-full">
          <article className="w-full">
            {content ? (
              <div
                className="max-w-none text-[1.08rem] text-slate-700 font-sans leading-[2.1] text-justify
                           [&_p]:mb-6 [&_p]:text-justify
                           [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:mb-6 [&_ul]:space-y-2.5
                           [&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:mb-6 [&_ol]:space-y-2.5
                           [&_li]:leading-[1.95]
                           [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[#054239] [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:font-qomra
                           [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#054239] [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-qomra
                           [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#054239] [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-qomra
                           [&_blockquote]:border-s-4 [&_blockquote]:border-[#b9a779] [&_blockquote]:ps-6 [&_blockquote]:pe-4 [&_blockquote]:py-4 [&_blockquote]:my-8 [&_blockquote]:text-slate-700 [&_blockquote]:bg-[#b9a779]/4 [&_blockquote]:rounded-e-2xl [&_blockquote]:shadow-sm
                           [&_a]:text-[#b9a779] [&_a]:underline [&_a]:hover:text-[#054239] [&_a]:font-bold
                           [&_strong]:font-bold [&_strong]:text-[#054239]
                           [&_img]:rounded-2xl [&_img]:my-8 [&_img]:w-full [&_img]:object-cover [&_img]:shadow-md [&_img]:border [&_img]:border-[#b9a779]/10
                           [&_br]:block [&_br]:content-[''] [&_br]:mt-2"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : !post.builderData ? (
              <p className="text-slate-400 italic py-10 text-center">{isRtl ? "لا يوجد محتوى لهذا الخبر" : "No news content to show"}</p>
            ) : null}
          </article>

          {/* Render dynamic page builder blocks if present */}
          {post.builderData && (
            <div className="mt-8 pt-8 border-t border-slate-100">
              <BlockRenderer builderData={post.builderData} isRtl={isRtl} />
            </div>
          )}

          {/* ── Attached Documents (PDF downloads) ── */}
          {attachments.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h3 className="text-lg sm:text-xl font-bold text-[#054239] mb-5 font-qomra flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-[#b9a779] transform rotate-45 inline-block shrink-0"></span>
                <span>{isRtl ? "الوثائق المرفقة" : "Attached Documents"}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm hover:shadow-md hover:border-[#b9a779]/50 transition-all duration-300"
                  >
                    {/* PDF icon */}
                    <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-50 text-red-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H14a1 1 0 01-1-1V3.5z" />
                        <text x="12" y="18" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#fff">PDF</text>
                      </svg>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800 group-hover:text-[#054239] transition-colors">
                        {att.name || (isRtl ? "وثيقة PDF" : "PDF document")}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-medium mt-0.5">
                        {isRtl ? "اضغط للعرض أو التحميل" : "Click to view or download"}
                      </span>
                    </span>
                    {/* Download arrow */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      className="w-5 h-5 text-[#b9a779] shrink-0 transition-transform group-hover:translate-y-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Section Divider */}
          <div className="diamond-divider my-10" />

          {/* Related / Latest News (at the end of article) */}
          {latestNews.length > 0 && (
            <div className="mt-14 pt-8 border-t border-slate-200">
              <h3 className="text-xl sm:text-2xl font-bold text-[#054239] mb-8 font-qomra flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-[#b9a779] transform rotate-45 inline-block shrink-0"></span>
                <span>{isRtl ? "أخبار مشابهة قد تهمك" : "Related News You May Like"}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {latestNews.map((news) => {
                  const newsTitle = isRtl ? news.titleAr : (news.titleEn || news.titleAr);
                  const newsSummary = isRtl ? news.summaryAr : (news.summaryEn || news.summaryAr);
                  const newsDate = toWesternNums(formatDate(news.publishedAt, isRtl));
                  const newsCategory = isRtl ? news.category?.nameAr : (news.category?.nameEn || news.category?.nameAr);

                  return (
                    <Link
                      key={news.id}
                      href={`/${locale}/news/${news.slug || news.id}`}
                      className="group flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full"
                    >
                      <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                        <Image
                          src={news.featuredImage || "/images/cultural-principle1.jpg"}
                          alt={newsTitle}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {newsCategory && (
                          <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[10px] text-[#054239] font-bold px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">
                            {newsCategory}
                          </span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col grow">
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#b9a779] transition-colors mb-2 min-h-[2.5rem]">
                          {newsTitle}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 flex-grow">
                          {newsSummary}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-auto font-medium">
                          {newsDate}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editorial Footer Links */}
          <div className="flex justify-between items-center py-6 mt-8 border-t border-slate-100">
            <Link
              href={`/${locale}/news`}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#054239] hover:text-[#b9a779] transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                className={`w-4 h-4 transition-transform ${isRtl ? "group-hover:translate-x-1.5" : "group-hover:-translate-x-1.5"}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" : "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"} />
              </svg>
              {isRtl ? "تصفح جميع الأخبار والمستجدات" : "Browse All News & Updates"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
