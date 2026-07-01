/**
 * browser-scraper-full.js — يسحب كل الأخبار مع صور وتواريخ
 *
 * 1. افتح https://moc.gov.sy/ar/news في المتصفح
 * 2. F12 → Console
 * 3. الصق هذا الكود واضغط Enter
 * 4. سيتم تحميل moc-content-full.json تلقائياً
 *
 * ⏱ متوقع: ~5-8 دقائق لـ 416 خبر
 */
(async () => {
  const BASE  = location.origin;
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const start = Date.now();

  function absUrl(href) {
    if (!href) return "";
    href = href.trim();
    if (href.startsWith("http"))  return href;
    if (href.startsWith("//"))    return "https:" + href;
    if (href.startsWith("/"))     return BASE + href;
    return "";
  }

  async function fetchDoc(url) {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: { "Accept": "text/html,application/xhtml+xml,*/*" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  function bestImage(doc) {
    const og = doc.querySelector('meta[property="og:image"]')?.content;
    if (og) return absUrl(og);

    const selectors = [
      ".article-image img", ".featured-image img", ".post-thumbnail img",
      "article img", ".content img", "main img", "img"
    ];
    for (const sel of selectors) {
      const img = doc.querySelector(sel);
      if (!img) continue;
      const src = img.dataset.src || img.dataset.lazySrc || img.getAttribute("src") || "";
      if (src && !src.includes("logo") && !src.includes("icon") && !src.includes("placeholder")) {
        return absUrl(src);
      }
    }
    return "";
  }

  function parseDate(doc) {
    const og = doc.querySelector('meta[property="article:published_time"]')?.content;
    if (og) return og;
    const timeEl = doc.querySelector("time[datetime]");
    if (timeEl) return timeEl.getAttribute("datetime");
    const dateEl = doc.querySelector(".date, .post-date, .article-date, .news-date, [class*='date']");
    if (dateEl) return dateEl.textContent.trim();
    return "";
  }

  // ── Step 1: collect all article URLs via pagination ────
  console.log("📋 Phase 1: Collecting all article URLs...");

  const articleUrls = new Set();

  // Detect pagination pattern from current page
  async function getPaginationUrls(listingUrl) {
    const doc = await fetchDoc(listingUrl);
    if (!doc) return [];

    // Extract links from this listing page
    const links = [...doc.querySelectorAll("a[href]")]
      .map(a => absUrl(a.getAttribute("href")))
      .filter(href => {
        const path = href.replace(BASE, "");
        const segs = path.split("/").filter(Boolean);
        return segs.length >= 3 && segs[0] === "ar";
      });

    links.forEach(l => articleUrls.add(l));

    // Find next page link
    const nextLink =
      doc.querySelector('a[rel="next"]') ||
      doc.querySelector('.next a, .pagination .next, a:contains("التالي"), a:contains(">>")') ||
      [...doc.querySelectorAll("a")].find(a =>
        /التالي|next|›|»|>>/.test(a.textContent) && a.href
      );

    return nextLink ? [absUrl(nextLink.getAttribute("href") || nextLink.href)] : [];
  }

  // Try multiple pagination patterns
  async function collectAllPages() {
    const visited = new Set();
    let queue = [
      `${BASE}/ar/news`,
    ];

    // Also try common patterns upfront
    for (let p = 2; p <= 42; p++) {
      queue.push(`${BASE}/ar/news?page=${p}`);
      queue.push(`${BASE}/ar/news/page/${p}`);
    }

    let listingsFetched = 0;

    for (const url of queue) {
      if (visited.has(url)) continue;
      visited.add(url);

      try {
        const doc = await fetchDoc(url);
        if (!doc) continue;

        const bodyText = doc.body?.textContent || "";
        if (bodyText.length < 200) continue; // empty page

        const links = [...doc.querySelectorAll("a[href]")]
          .map(a => absUrl(a.getAttribute("href")))
          .filter(href => {
            const path = href.replace(BASE, "");
            const segs = path.split("/").filter(Boolean);
            // Article URLs typically have 3+ segments and a numeric ID or slug
            return (
              segs.length >= 3 &&
              segs[0] === "ar" &&
              href !== url &&
              !href.includes("?page=") &&
              !href.includes("/page/") &&
              !href.includes("/news/page")
            );
          });

        const before = articleUrls.size;
        links.forEach(l => articleUrls.add(l));
        const added = articleUrls.size - before;

        listingsFetched++;
        if (listingsFetched % 5 === 0 || added > 0) {
          process?.stdout?.write?.(`\r  Pages checked: ${listingsFetched} | Articles found: ${articleUrls.size}`);
          console.log(`  Page ${listingsFetched}: +${added} articles → total ${articleUrls.size}`);
        }

        // Stop if this page returned 0 new articles (end of pagination)
        if (added === 0 && listingsFetched > 5) {
          // Check if this was a ?page= URL — if so, stop that pattern
          if (url.includes("?page=") || url.includes("/page/")) {
            // Try next pattern or give up
          }
        }

        await delay(300);
      } catch {}
    }

    console.log(`\n✅ Phase 1 done: ${articleUrls.size} article URLs collected`);
  }

  await collectAllPages();

  if (articleUrls.size === 0) {
    console.error("❌ No article URLs found. Make sure you're on moc.gov.sy/ar/news");
    return;
  }

  // ── Step 2: scrape each article ───────────────────────
  console.log(`\n📰 Phase 2: Scraping ${articleUrls.size} articles...`);
  console.log("⏱ Estimated time:", Math.round(articleUrls.size * 0.4 / 60), "minutes");

  const articles = [];
  const failed   = [];
  let   i        = 0;

  for (const url of articleUrls) {
    i++;
    if (i % 10 === 0) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      const eta     = Math.round((articleUrls.size - i) * 0.4);
      console.log(`  [${i}/${articleUrls.size}] ✅${articles.length} ❌${failed.length} | ${elapsed}s elapsed, ~${eta}s remaining`);
    }

    try {
      const doc = await fetchDoc(url);
      if (!doc) { failed.push(url); continue; }

      doc.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar,.breadcrumb,.share,.related,.comments").forEach(e => e.remove());

      // Title
      const title =
        doc.querySelector('meta[property="og:title"]')?.content?.trim() ||
        doc.querySelector("h1")?.textContent?.trim() ||
        doc.querySelector("h2")?.textContent?.trim() || "";

      if (!title || title.length < 5) continue;

      // Summary
      const summary =
        doc.querySelector('meta[name="description"]')?.content?.trim() ||
        doc.querySelector('meta[property="og:description"]')?.content?.trim() ||
        doc.querySelector(".excerpt,.summary,.lead,.intro")?.textContent?.trim() || "";

      // Content HTML
      const contentEl = doc.querySelector(
        ".article-body, .post-content, .entry-content, .content-area, article .content, main article, article, main"
      );
      const contentHtml = contentEl?.innerHTML?.trim() || "";
      const contentText = contentEl?.textContent?.trim() || "";

      // Date
      const dateStr = parseDate(doc);

      // Image
      const image = bestImage(doc);

      articles.push({
        titleAr:       title,
        summaryAr:     summary || contentText.slice(0, 250),
        contentAr:     contentHtml,
        featuredImage: image,
        sourceUrl:     url,
        publishedAt:   dateStr || new Date().toISOString(),
        type:          "NEWS",
        status:        "PUBLISHED",
      });
    } catch (e) {
      failed.push(url);
    }

    await delay(350);
  }

  const elapsed = Math.round((Date.now() - start) / 1000);

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Done in ${elapsed}s`);
  console.log(`   Articles scraped : ${articles.length}`);
  console.log(`   Failed           : ${failed.length}`);
  console.log(`   With images      : ${articles.filter(a => a.featuredImage).length}`);
  console.log("═".repeat(50));

  // ── Download JSON ──────────────────────────────────────
  const blob = new Blob([JSON.stringify(articles, null, 2)], { type: "application/json" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "moc-content-full.json";
  a.click();

  console.log("\n✅ تم تحميل moc-content-full.json");
  console.log("الخطوة التالية:");
  console.log("  node scripts/import-moc.mjs moc-content-full.json");
})();
