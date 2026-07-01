/**
 * browser-scraper-click.js
 * يضغط زر "الصفحة التالية" تلقائياً ويسحب كل الأخبار
 *
 * 1. افتح https://moc.gov.sy/ar/news في المتصفح
 * 2. F12 → Console
 * 3. الصق هذا الكود واضغط Enter
 * ⏱ ~20-30 دقيقة لـ 416 خبر (عربي + إنجليزي)
 */
(async () => {
  const BASE  = location.origin;
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const start = Date.now();

  function absUrl(href) {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    if (href.startsWith("//"))   return "https:" + href;
    if (href.startsWith("/"))    return BASE + href;
    return "";
  }

  // ── Collect article links from current DOM ───────────
  function collectLinksFromDOM() {
    return [...document.querySelectorAll("a[href]")]
      .map(a => a.href)
      .filter(href => {
        const path = href.replace(BASE, "");
        const segs = path.split("/").filter(Boolean);
        return href.startsWith(BASE) && segs.length >= 3 && segs[0] === "ar"
          && !href.includes("?page=") && !/\/(news|events|achievements|about)\/?$/.test(path);
      });
  }

  // ── Find and click next page button ─────────────────
  function getNextBtn() {
    // Primary: aria-label
    return document.querySelector('[aria-label="Go to next page"]:not([disabled])')
      || document.querySelector('[aria-label*="next"]:not([disabled])')
      || document.querySelector('[aria-label*="التالي"]:not([disabled])')
      || null;
  }

  function isNextDisabled() {
    const btn = document.querySelector('[aria-label="Go to next page"]');
    if (!btn) return true;
    return btn.hasAttribute("disabled") || btn.classList.contains("disabled")
      || btn.getAttribute("aria-disabled") === "true"
      || window.getComputedStyle(btn).opacity < 0.5;
  }

  // ── Phase 1: click through all pages ────────────────
  console.log("📋 Phase 1: Navigating through all pages...\n");

  const articleUrls = new Set();
  let page = 1;

  // Collect page 1
  collectLinksFromDOM().forEach(l => articleUrls.add(l));
  console.log(`  Page ${page}: ${articleUrls.size} articles so far`);

  // Keep clicking next
  while (!isNextDisabled() && page < 30) {
    const btn = getNextBtn();
    if (!btn) { console.log("  ⚠ No next button found."); break; }

    const before = articleUrls.size;
    btn.click();

    // Wait for new articles to load (up to 5 seconds)
    let waited = 0;
    while (waited < 5000) {
      await delay(300);
      waited += 300;
      collectLinksFromDOM().forEach(l => articleUrls.add(l));
      if (articleUrls.size > before) break;
    }

    page++;
    const added = articleUrls.size - before;
    console.log(`  Page ${page}: +${added} → total ${articleUrls.size}`);

    if (added === 0) { console.log("  ⚠ No new articles on this page."); break; }
    await delay(500);
  }

  console.log(`\n✅ Phase 1: ${articleUrls.size} articles across ${page} pages\n`);
  if (!articleUrls.size) {
    console.log("❌ No articles found. Make sure you're on moc.gov.sy/ar/news");
    return;
  }

  // ── Phase 2: fetch each article ─────────────────────
  async function fetchDoc(url) {
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) return null;
      return new DOMParser().parseFromString(await res.text(), "text/html");
    } catch { return null; }
  }

  function bestImage(doc) {
    const og = doc.querySelector('meta[property="og:image"]')?.content;
    if (og) return absUrl(og);
    for (const img of doc.querySelectorAll("img")) {
      const src = img.dataset.src || img.getAttribute("src") || "";
      if (src && !src.match(/logo|icon|placeholder|avatar|arrow|sprite/i)) return absUrl(src);
    }
    return "";
  }

  function getDate(doc) {
    return doc.querySelector('meta[property="article:published_time"]')?.content
      || doc.querySelector('meta[name="publish_date"]')?.content
      || doc.querySelector("time[datetime]")?.getAttribute("datetime")
      || doc.querySelector(".date,.post-date,.article-date,.news-date,[class*='date']")?.textContent?.trim()
      || "";
  }

  function getSocial(doc) {
    const s = { facebookUrl: "", instagramUrl: "", twitterUrl: "", youtubeUrl: "" };
    doc.querySelectorAll("a[href]").forEach(a => {
      const h = a.href || "";
      if (/facebook\.com\/(?!sharer)/i.test(h) && !s.facebookUrl)  s.facebookUrl  = h;
      if (/instagram\.com\//i.test(h) && !s.instagramUrl)           s.instagramUrl = h;
      if (/(twitter|x)\.com\//i.test(h) && !s.twitterUrl)           s.twitterUrl   = h;
      if (/youtube\.com\//i.test(h) && !s.youtubeUrl)               s.youtubeUrl   = h;
    });
    return s;
  }

  console.log(`📰 Phase 2: Scraping ${articleUrls.size} articles (AR + EN)...`);
  console.log(`⏱ ~${Math.round(articleUrls.size * 0.8 / 60)} minutes\n`);

  const articles = [];
  let i = 0;

  for (const url of articleUrls) {
    i++;
    if (i % 10 === 0) {
      const eta = Math.round((articleUrls.size - i) * 0.8);
      console.log(`  [${i}/${articleUrls.size}] ✅${articles.length} | ETA ~${eta}s`);
    }

    try {
      const docAr = await fetchDoc(url);
      if (!docAr) continue;
      docAr.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar,.breadcrumb,.share,.related").forEach(e => e.remove());

      const titleAr = docAr.querySelector('meta[property="og:title"]')?.content?.trim() || docAr.querySelector("h1")?.textContent?.trim() || "";
      if (!titleAr || titleAr.length < 5) continue;

      const summaryAr = docAr.querySelector('meta[name="description"]')?.content?.trim() || docAr.querySelector('meta[property="og:description"]')?.content?.trim() || "";
      const contentEl = docAr.querySelector(".article-body,.post-content,.entry-content,.content-area,article .content,main article,article,main");

      // English
      let titleEn = "", summaryEn = "", contentEn = "";
      const enUrl = url.replace("/ar/", "/en/");
      if (enUrl !== url) {
        await delay(200);
        const docEn = await fetchDoc(enUrl);
        if (docEn) {
          docEn.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar").forEach(e => e.remove());
          titleEn   = docEn.querySelector('meta[property="og:title"]')?.content?.trim() || docEn.querySelector("h1")?.textContent?.trim() || "";
          if (titleEn === titleAr) titleEn = "";
          if (titleEn) {
            summaryEn = docEn.querySelector('meta[name="description"]')?.content?.trim() || "";
            const ceEn = docEn.querySelector(".article-body,.post-content,.entry-content,.content-area,article .content,main article,article,main");
            contentEn = ceEn?.innerHTML?.trim() || "";
          }
        }
      }

      articles.push({
        titleAr,
        titleEn:       titleEn   || null,
        summaryAr:     summaryAr || contentEl?.textContent?.trim().slice(0, 250) || "",
        summaryEn:     summaryEn || null,
        contentAr:     contentEl?.innerHTML?.trim() || "",
        contentEn:     contentEn || null,
        featuredImage: bestImage(docAr),
        sourceUrl:     url,
        publishedAt:   getDate(docAr) || new Date().toISOString(),
        type:          "NEWS",
        status:        "PUBLISHED",
        ...getSocial(docAr),
      });
    } catch {}

    await delay(400);
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Done in ${Math.floor(elapsed/60)}m ${elapsed%60}s`);
  console.log(`   Scraped   : ${articles.length}`);
  console.log(`   English   : ${articles.filter(a => a.titleEn).length}`);
  console.log(`   Images    : ${articles.filter(a => a.featuredImage).length}`);
  console.log(`   Facebook  : ${articles.filter(a => a.facebookUrl).length}`);
  console.log("═".repeat(50));

  const blob = new Blob([JSON.stringify(articles, null, 2)], { type: "application/json" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "moc-content-full.json";
  a.click();
  console.log("✅ تم تحميل moc-content-full.json");
  console.log("▶  node scripts/import-moc.mjs moc-content-full.json");
})();
