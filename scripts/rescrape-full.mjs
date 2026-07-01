/**
 * rescrape-full.mjs — يعيد سحب كل المقالات بالكامل
 *   • عنوان نظيف (بدون ",خبر | وزارة الثقافة")
 *   • تاريخ النشر الصحيح من الموقع
 *   • المحتوى الكامل (كل الفقرات)
 *   • كل صور المقال
 *   • الإنجليزي من /en/
 *
 * تشغيل: node scripts/rescrape-full.mjs
 */

import { readFileSync, writeFileSync } from "fs";

const DELAY = 350;
const delay = ms => new Promise(r => setTimeout(r, ms));

const existing = JSON.parse(readFileSync("moc-content-full.json", "utf8"));
const urls = existing.map(a => a.sourceUrl).filter(Boolean);

console.log(`📰 Re-scraping ${urls.length} articles with full content...\n`);

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&nbsp;/g, " ");
}

function cleanTitle(t) {
  return decodeEntities(t)
    .replace(/\s*,?\s*خبر\s*\|\s*وزارة الثقافة\s*$/u, "")
    .replace(/\s*\|\s*وزارة الثقافة\s*$/u, "")
    .trim();
}

function cleanContent(desc) {
  let c = decodeEntities(desc)
    .replace(/^اقرأ خبر\s*«?\s*/u, "")          // strip "اقرأ خبر «" prefix
    .replace(/»?\s*من وزارة الثقافة\.?\s*$/u, "") // strip "» من وزارة الثقافة." suffix
    .replace(/\r\n/g, "\n")
    .trim();
  // Convert paragraphs (double newline) into <p> tags
  const paras = c.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return paras.map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("\n");
}

function parseDate(html) {
  const dm = html.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*([صم])/);
  if (!dm) return null;
  const [, date, time, ampm] = dm;
  let [h, m] = time.split(":").map(Number);
  if (ampm === "م" && h < 12) h += 12;
  if (ampm === "ص" && h === 12) h = 0;
  return `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`;
}

function getImages(html, id) {
  const re = new RegExp(`uploads/News/${id}/[a-zA-Z0-9-]+\\.[a-zA-Z]+`, "g");
  return [...new Set((html.match(re) || []))].map(p => "https://dashboard.qmindtech-ai.net/" + p);
}

function getMeta(html, prop) {
  // try property= then name=
  return html.match(new RegExp(`property="${prop}"[^>]*content="([^"]*)"`))?.[1]
      || html.match(new RegExp(`name="${prop}"[^>]*content="([^"]*)"`))?.[1]
      || html.match(new RegExp(`content="([^"]*)"[^>]*property="${prop}"`))?.[1]
      || "";
}

async function fetchArticle(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

const articles = [];
let i = 0, fails = 0;

for (const url of urls) {
  i++;
  const id = url.split("/").pop();

  const htmlAr = await fetchArticle(url);
  if (!htmlAr) { fails++; await delay(DELAY); continue; }

  const titleAr   = cleanTitle(getMeta(htmlAr, "og:title"));
  if (!titleAr) { fails++; await delay(DELAY); continue; }

  const descAr    = getMeta(htmlAr, "og:description") || getMeta(htmlAr, "description");
  const contentAr = cleanContent(descAr);
  const summaryAr = decodeEntities(descAr).replace(/^اقرأ خبر\s*«?\s*/u, "").replace(/»?\s*من وزارة الثقافة\.?\s*$/u, "").replace(/\s+/g, " ").trim().slice(0, 280);
  const publishedAt = parseDate(htmlAr);
  const images    = getImages(htmlAr, id);

  // Social links
  const social = { facebookUrl: "", instagramUrl: "", twitterUrl: "", youtubeUrl: "" };
  for (const m of htmlAr.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const h = m[1];
    if (/facebook\.com\/(?!sharer)/i.test(h) && !social.facebookUrl)  social.facebookUrl  = h;
    if (/instagram\.com\//i.test(h) && !social.instagramUrl)           social.instagramUrl = h;
    if (/(twitter|x)\.com\//i.test(h) && !social.twitterUrl)           social.twitterUrl   = h;
    if (/youtube\.com\//i.test(h) && !social.youtubeUrl)               social.youtubeUrl   = h;
  }

  // English version
  let titleEn = null, contentEn = null, summaryEn = null;
  const enUrl = url.replace("/ar/", "/en/");
  await delay(150);
  const htmlEn = await fetchArticle(enUrl);
  if (htmlEn) {
    const tEn = cleanTitle(getMeta(htmlEn, "og:title")).replace(/\s*\|\s*Ministry of Culture\s*$/i, "").trim();
    if (tEn && tEn !== titleAr) {
      titleEn = tEn;
      const dEn = getMeta(htmlEn, "og:description") || getMeta(htmlEn, "description");
      contentEn = decodeEntities(dEn).replace(/^Read news\s*«?\s*/i, "").replace(/»?\s*from the Ministry of Culture\.?\s*$/i, "").replace(/\r\n/g, "\n").trim();
      contentEn = contentEn.split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${p.replace(/\n/g,"<br/>")}</p>`).join("\n");
      summaryEn = decodeEntities(dEn).replace(/\s+/g," ").trim().slice(0,280);
    }
  }

  articles.push({
    titleAr,
    titleEn,
    summaryAr,
    summaryEn,
    contentAr,
    contentEn,
    featuredImage: images[0] || "",
    gallery: images,
    sourceUrl: url,
    publishedAt: publishedAt || new Date().toISOString(),
    type: "NEWS",
    status: "PUBLISHED",
    ...social,
  });

  if (i % 10 === 0) {
    const withImg = articles.filter(a => a.gallery.length).length;
    console.log(`  [${i}/${urls.length}] ✅${articles.length} | imgs:${withImg} | fails:${fails}`);
  }

  await delay(DELAY);
}

console.log(`\n${"═".repeat(50)}`);
console.log(`✅ Done!`);
console.log(`   Articles      : ${articles.length}`);
console.log(`   With content  : ${articles.filter(a => a.contentAr).length}`);
console.log(`   With images   : ${articles.filter(a => a.gallery.length).length}`);
console.log(`   Multi-image   : ${articles.filter(a => a.gallery.length > 1).length}`);
console.log(`   With date     : ${articles.filter(a => a.publishedAt && !a.publishedAt.startsWith(new Date().toISOString().slice(0,10))).length}`);
console.log(`   With English  : ${articles.filter(a => a.titleEn).length}`);
console.log("═".repeat(50));

writeFileSync("moc-content-full.json", JSON.stringify(articles, null, 2));
console.log("✅ Saved to moc-content-full.json");
console.log("▶  node scripts/import-moc.mjs moc-content-full.json");
