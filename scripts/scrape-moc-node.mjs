/**
 * scrape-moc-node.mjs — يسحب الأخبار من moc.gov.sy مباشرة (Node.js)
 * تشغيل: node scripts/scrape-moc-node.mjs
 */

import { writeFileSync } from "fs";
import { JSDOM } from "jsdom";

const BASE  = "https://moc.gov.sy";
const DELAY = 500;
const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchDoc(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
        "Accept-Language": "ar,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return new JSDOM(html).window.document;
  } catch { return null; }
}

function absUrl(href) {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  if (href.startsWith("//"))   return "https:" + href;
  if (href.startsWith("/"))    return BASE + href;
  return "";
}

function bestImage(doc) {
  const og = doc.querySelector('meta[property="og:image"]')?.content;
  if (og) return absUrl(og);
  for (const img of doc.querySelectorAll("img")) {
    const src = img.dataset?.src || img.getAttribute("src") || "";
    if (src && !src.match(/logo|icon|placeholder|avatar|arrow|sprite/i))
      return absUrl(src);
  }
  return "";
}

function getDate(doc) {
  return (
    doc.querySelector('meta[property="article:published_time"]')?.content ||
    doc.querySelector('meta[name="publish_date"]')?.content ||
    doc.querySelector("time[datetime]")?.getAttribute("datetime") ||
    doc.querySelector(".date,.post-date,.article-date,.news-date,[class*='date']")?.textContent?.trim() ||
    ""
  );
}

function getSocialLinks(doc) {
  const links = { facebookUrl: null, instagramUrl: null, twitterUrl: null, youtubeUrl: null };
  doc.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href") || "";
    const full = absUrl(href);
    if (/facebook\.com\/(?!sharer)/i.test(full) && !links.facebookUrl)  links.facebookUrl  = full;
    if (/instagram\.com\//i.test(full) && !links.instagramUrl)           links.instagramUrl = full;
    if (/(twitter|x)\.com\//i.test(full) && !links.twitterUrl)           links.twitterUrl   = full;
    if (/youtube\.com\//i.test(full) && !links.youtubeUrl)               links.youtubeUrl   = full;
  });
  return links;
}

function getNextPage(doc) {
  const rel = doc.querySelector('a[rel="next"]');
  if (rel) return absUrl(rel.getAttribute("href"));
  for (const a of doc.querySelectorAll("a")) {
    const txt  = a.textContent?.trim();
    const href = a.getAttribute("href");
    if (href && /^(التالي|التالية|next|›|»|>>)$/i.test(txt)) return absUrl(href);
  }
  return null;
}

function getArticleLinks(doc, listingUrl) {
  return [...doc.querySelectorAll("a[href]")]
    .map(a => absUrl(a.getAttribute("href")))
    .filter(href => {
      const path = href.replace(BASE, "");
      const segs = path.split("/").filter(Boolean);
      return href.startsWith(BASE) && segs.length >= 3 && segs[0] === "ar"
        && href !== listingUrl && !href.includes("?page=") && !href.includes("/page/")
        && !/\/(news|events|achievements|about)\/?$/.test(path);
    });
}

// ── Phase 1: collect article URLs ───────────────────
console.log("📋 Phase 1: Walking listing pages...\n");

const articleUrls = new Set();
let currentUrl = `${BASE}/ar/news`;
let page = 1, noProgress = 0;

while (currentUrl && page <= 30) {
  const doc = await fetchDoc(currentUrl);
  if (!doc) { console.log(`❌ Failed page ${page}`); break; }

  const links  = getArticleLinks(doc, currentUrl);
  const before = articleUrls.size;
  links.forEach(l => articleUrls.add(l));
  const added  = articleUrls.size - before;
  console.log(`  Page ${page}: +${added} → total ${articleUrls.size}  ${currentUrl}`);

  if (added === 0 && ++noProgress >= 2) { console.log("  ⚠ Stopping."); break; }
  else if (added > 0) noProgress = 0;

  const next = getNextPage(doc);
  if (!next || next === currentUrl) { console.log(`  ✅ Last page.`); break; }
  currentUrl = next;
  page++;
  await delay(DELAY);
}

console.log(`\n✅ Phase 1: ${articleUrls.size} articles found\n`);

// ── Phase 2: scrape each article ────────────────────
console.log(`📰 Phase 2: Scraping ${articleUrls.size} articles...\n`);

const articles = [];
let i = 0;

for (const url of articleUrls) {
  i++;
  if (i % 10 === 0) process.stdout.write(`\r  [${i}/${articleUrls.size}] ✅${articles.length}`);

  const docAr = await fetchDoc(url);
  if (!docAr) { await delay(DELAY); continue; }

  docAr.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar,.breadcrumb,.share,.related").forEach(e => e.remove());

  const titleAr = docAr.querySelector('meta[property="og:title"]')?.content?.trim() || docAr.querySelector("h1")?.textContent?.trim() || "";
  if (!titleAr || titleAr.length < 5) { await delay(DELAY); continue; }

  const summaryAr   = docAr.querySelector('meta[name="description"]')?.content?.trim() || docAr.querySelector('meta[property="og:description"]')?.content?.trim() || "";
  const contentElAr = docAr.querySelector(".article-body,.post-content,.entry-content,.content-area,article .content,main article,article,main");
  const dateStr     = getDate(docAr);
  const img         = bestImage(docAr);
  const social      = getSocialLinks(docAr);

  // English version
  let titleEn = null, summaryEn = null, contentEn = null;
  const enUrl = url.replace("/ar/", "/en/");
  if (enUrl !== url) {
    await delay(200);
    const docEn = await fetchDoc(enUrl);
    if (docEn) {
      docEn.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar").forEach(e => e.remove());
      titleEn = docEn.querySelector('meta[property="og:title"]')?.content?.trim() || docEn.querySelector("h1")?.textContent?.trim() || null;
      if (titleEn === titleAr) titleEn = null;
      if (titleEn) {
        summaryEn = docEn.querySelector('meta[name="description"]')?.content?.trim() || null;
        const contentElEn = docEn.querySelector(".article-body,.post-content,.entry-content,.content-area,article .content,main article,article,main");
        contentEn = contentElEn?.innerHTML?.trim() || null;
      }
    }
  }

  articles.push({
    titleAr,
    titleEn,
    summaryAr:     summaryAr || contentElAr?.textContent?.trim().slice(0, 250) || "",
    summaryEn,
    contentAr:     contentElAr?.innerHTML?.trim() || "",
    contentEn,
    featuredImage: img,
    sourceUrl:     url,
    publishedAt:   dateStr || new Date().toISOString(),
    type:          "NEWS",
    status:        "PUBLISHED",
    ...social,
  });

  await delay(DELAY);
}

// ── Save ─────────────────────────────────────────────
console.log(`\n\n${"═".repeat(50)}`);
console.log(`✅ Done!`);
console.log(`   Scraped        : ${articles.length}`);
console.log(`   With English   : ${articles.filter(a => a.titleEn).length}`);
console.log(`   With images    : ${articles.filter(a => a.featuredImage).length}`);
console.log(`   With Facebook  : ${articles.filter(a => a.facebookUrl).length}`);
console.log(`   With Instagram : ${articles.filter(a => a.instagramUrl).length}`);
console.log("═".repeat(50));

writeFileSync("moc-content-full.json", JSON.stringify(articles, null, 2));
console.log("✅ Saved to moc-content-full.json");
console.log("▶  Run: node scripts/import-moc.mjs moc-content-full.json");
