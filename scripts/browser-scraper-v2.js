/**
 * browser-scraper-v2.js — أخبار مع صور
 *
 * 1. افتح https://moc.gov.sy/ar في المتصفح
 * 2. F12 → Console
 * 3. الصق هذا الكود واضغط Enter
 * 4. سيتم تحميل moc-content-v2.json
 */
(async () => {
  const BASE  = location.origin;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  function absUrl(href) {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    if (href.startsWith("//"))   return "https:" + href;
    if (href.startsWith("/"))    return BASE + href;
    return BASE + "/" + href;
  }

  function bestImage(doc) {
    // OG image (most reliable)
    const og = doc.querySelector('meta[property="og:image"]')?.content;
    if (og) return absUrl(og);

    // First real image (not icon/logo/tiny)
    const imgs = [...doc.querySelectorAll("img")];
    for (const img of imgs) {
      const src = img.dataset.src || img.dataset.lazySrc || img.src || "";
      const w   = img.naturalWidth || img.width || 0;
      const h   = img.naturalHeight || img.height || 0;
      if (src && !src.includes("logo") && !src.includes("icon") && (w === 0 || w > 100)) {
        return absUrl(src);
      }
    }
    return "";
  }

  async function fetchDoc(url) {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  // ── Collect article links ──────────────────────────────
  console.log("🔍 Collecting article links...");

  const listingPages = [
    `${BASE}/ar/news`,
    `${BASE}/ar/news?page=2`,
    `${BASE}/ar/news?page=3`,
  ];

  const articleUrls = new Set();

  // Also grab links from current page
  document.querySelectorAll("a[href]").forEach(a => {
    const href = absUrl(a.getAttribute("href"));
    const path = href.replace(BASE, "");
    if (path.split("/").filter(Boolean).length >= 3) articleUrls.add(href);
  });

  for (const url of listingPages) {
    try {
      const doc = await fetchDoc(url);
      if (!doc) continue;
      doc.querySelectorAll("a[href]").forEach(a => {
        const href = absUrl(a.getAttribute("href"));
        const path = href.replace(BASE, "");
        const segs = path.split("/").filter(Boolean);
        if (segs.length >= 3 && segs[0] === "ar") articleUrls.add(href);
      });
      await delay(500);
    } catch {}
  }

  console.log(`📰 Found ${articleUrls.size} article URLs`);

  // ── Scrape each article ────────────────────────────────
  const articles = [];
  let i = 0;

  for (const url of articleUrls) {
    i++;
    if (i % 5 === 0) console.log(`  ${i}/${articleUrls.size} ...`);

    try {
      const doc = await fetchDoc(url);
      if (!doc) continue;

      // Remove noise
      doc.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar,.ad,.share,.related").forEach(e => e.remove());

      // Title
      const title =
        doc.querySelector('meta[property="og:title"]')?.content ||
        doc.querySelector("h1")?.textContent?.trim() || "";
      if (!title || title.length < 5) continue;

      // Summary
      const summary =
        doc.querySelector('meta[name="description"]')?.content ||
        doc.querySelector('meta[property="og:description"]')?.content ||
        doc.querySelector(".excerpt, .summary, .lead")?.textContent?.trim() || "";

      // Content
      const contentEl = doc.querySelector(
        "article, .article-body, .post-content, .entry-content, .content-area, main"
      );
      const contentHtml = contentEl?.innerHTML?.trim() || "";
      const contentText = contentEl?.textContent?.trim() || "";

      // Date
      const dateEl = doc.querySelector("time, .date, .post-date, .article-date");
      const dateStr =
        dateEl?.getAttribute("datetime") ||
        dateEl?.textContent?.trim() ||
        doc.querySelector('meta[property="article:published_time"]')?.content || "";

      // Image
      const image = bestImage(doc);

      articles.push({
        titleAr:      title,
        summaryAr:    summary || contentText.slice(0, 250),
        contentAr:    contentHtml,
        featuredImage: image,
        sourceUrl:    url,
        publishedAt:  dateStr || new Date().toISOString(),
        type:         "NEWS",
        status:       "PUBLISHED",
      });
    } catch {}

    await delay(400);
  }

  console.log(`✅ Scraped ${articles.length} articles`);

  // ── Download JSON ──────────────────────────────────────
  const blob = new Blob([JSON.stringify(articles, null, 2)], { type: "application/json" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "moc-content-v2.json";
  a.click();

  console.log("✅ تم تحميل moc-content-v2.json");
  console.log("الخطوة التالية: ضع الملف في مجلد المشروع ثم node scripts/import-moc.mjs moc-content-v2.json");
})();
