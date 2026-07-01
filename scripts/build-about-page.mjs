/**
 * build-about-page.mjs
 *
 * يقرأ moc-about.json ويولّد صفحة Next.js محدّثة لـ about-ministry
 *
 * تشغيل:
 *   node scripts/build-about-page.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const filePath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve("moc-about.json");

let data;
try {
  data = JSON.parse(readFileSync(filePath, "utf-8"));
} catch (e) {
  console.error("❌ Could not read moc-about.json:", e.message);
  process.exit(1);
}

console.log(`✅ Loaded: ${data.title}`);
console.log(`   Sections: ${data.sections?.length}`);
console.log(`   Images:   ${data.images?.length}`);

// ── Build sections JSX ─────────────────────────────────
function escapeJsx(str = "") {
  return str.replace(/`/g, "'").replace(/\$\{/g, "\\${").replace(/<\/script>/gi, "<\\/script>");
}

const sections = (data.sections || [])
  .filter(s => s.content?.length > 0 || s.title)
  .slice(0, 10); // max 10 sections

const sectionData = JSON.stringify(
  sections.map(s => ({
    title:   s.title,
    content: s.content?.map(c => c.text).filter(Boolean).join("\n\n") || "",
  })),
  null,
  2
);

const imagesData = JSON.stringify(
  (data.images || []).filter(img => img.src).slice(0, 20),
  null,
  2
);

const statsData = JSON.stringify(
  (data.stats || []).slice(0, 8),
  null,
  2
);

// ── Generate the page ──────────────────────────────────
const pageContent = `"use client";

import React, { useState, use } from "react";
import Image from "next/image";
import { translations } from "../../../data/translations";

/* ── Content scraped from ${data.url} on ${data.scrapedAt?.slice(0, 10)} ── */

const SECTIONS = ${sectionData};

const GALLERY = ${imagesData};

const STATS = ${statsData};

export default function AboutPage(props) {
  const params   = use(props.params);
  const locale   = params.locale || "ar";
  const isRtl    = locale === "ar";
  const [tab, setTab] = useState(0);

  const heroImage = ${JSON.stringify(data.heroImage || "")};
  const title     = ${JSON.stringify(data.title || "حول الوزارة")};
  const desc      = ${JSON.stringify(data.description || "")};

  return (
    <div
      className="flex flex-col w-full min-h-screen bg-[#FBF9F6] pt-28"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden border-b border-[#A48E68]/15">
        <div className="absolute inset-0 z-0">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={title}
              fill
              priority
              unoptimized
              className="object-cover brightness-[0.3] saturate-[0.8]"
            />
          ) : (
            <div className="w-full h-full bg-[#002723]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#002723]/80 via-[#002723]/60 to-[#002723]/90" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center gap-4">
          <span className="text-xs uppercase text-[#A48E68] font-bold tracking-widest">
            {isRtl ? "وزارة الثقافة السورية" : "Syrian Ministry of Culture"}
          </span>
          <h1 className="text-white font-extrabold text-3xl sm:text-4xl">{title}</h1>
          <div className="w-16 h-[2px] bg-[#A48E68] mt-1" />
          {desc && (
            <p className="text-white/80 text-sm sm:text-base max-w-2xl leading-relaxed mt-2">
              {desc}
            </p>
          )}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      {STATS.length > 0 && (
        <section className="bg-[#002723] py-10 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.slice(0, 8).map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center">
                <span className="text-3xl font-extrabold text-[#b9a779]">{s.number}</span>
                <span className="text-white/70 text-xs">{s.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Sections tabs ────────────────────────────── */}
      {SECTIONS.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 w-full">

          {/* Tab buttons */}
          {SECTIONS.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10">
              {SECTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className={\`px-4 py-2 rounded-full text-sm font-semibold border transition-all \${
                    tab === i
                      ? "bg-[#002723] text-white border-[#002723]"
                      : "bg-white text-[#002723] border-[#A48E68]/40 hover:border-[#A48E68]"
                  }\`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}

          {/* Active section content */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 sm:p-12">
            <h2 className="text-xl sm:text-2xl font-bold text-[#002723] mb-6">
              {SECTIONS[tab]?.title}
            </h2>
            <div className="text-slate-700 leading-loose text-base whitespace-pre-line">
              {SECTIONS[tab]?.content}
            </div>
          </div>
        </section>
      )}

      {/* ── Gallery ──────────────────────────────────── */}
      {GALLERY.filter(img => img.src).length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 w-full">
          <h2 className="text-xl font-bold text-[#002723] mb-6">
            {isRtl ? "معرض الصور" : "Gallery"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GALLERY.filter(img => img.src).slice(0, 12).map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                <Image
                  src={img.src}
                  alt={img.alt || ""}
                  fill
                  unoptimized
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
`;

const outPath = resolve(
  "src", "app", "[locale]", "about-ministry", "page.js"
);

writeFileSync(outPath, pageContent, "utf-8");
console.log(`\n✅ Page written to: ${outPath}`);
console.log("شغّل الموقع وافتح /ar/about-ministry لترى النتيجة.");
