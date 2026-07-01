/**
 * browser-scraper.js
 *
 * شغّل هذا الكود في Console المتصفح وأنت على موقع moc.gov.sy
 * سيسحب كل الأخبار والفعاليات ويضعها في JSON جاهز للاستيراد
 *
 * الخطوات:
 * 1. افتح https://moc.gov.sy/ar في المتصفح
 * 2. F12 → Console
 * 3. الصق هذا الكود كاملاً واضغط Enter
 * 4. انتظر حتى يطبع "✅ Done" ثم انسخ الـ JSON
 */

(async () => {
  const BASE = location.origin;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ─── helpers ───────────────────────────────────────────
  const getText = (el, sel) => el?.querySelector(sel)?.textContent?.trim() || "";
  const getAttr = (el, sel, attr) => el?.querySelector(sel)?.getAttribute(attr) || "";
  const absUrl  = href => href?.startsWith("http") ? href : BASE + href;

  // ─── Step 1: probe the homepage to find selectors ──────
  console.log("🔍 Probing homepage structure...");
  const home = document.cloneNode(true);

  // Find all article/news links on current page
  const allLinks = [...document.querySelectorAll("a[href]")]
    .map(a => a.getAttribute("href"))
    .filter(h => h && h.includes("/ar/") && h.length > 10)
    .map(absUrl);

  const uniqueLinks = [...new Set(allLinks)];
  console.log(`Found ${uniqueLinks.length} internal links`);

  // Group by path depth to find article patterns
  const patterns = {};
  uniqueLinks.forEach(url => {
    const path = url.replace(BASE, "");
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const key = parts.slice(0, 2).join("/");
      if (!patterns[key]) patterns[key] = [];
      patterns[key].push(url);
    }
  });

  console.log("📌 URL patterns found:");
  Object.entries(patterns)
    .sort((a,b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([k,v]) => console.log(`  ${v.length}x /${k}`));

  // ─── Step 2: scrape news listing pages ─────────────────
  console.log("\n📰 Fetching news pages...");

  const newsUrls = [
    `${BASE}/ar/news`,
    `${BASE}/ar/akhbar`,
    `${BASE}/ar/أخبار`,
  ];

  // Also check patterns for news-like paths
  Object.entries(patterns).forEach(([k, urls]) => {
    if (/news|akhbar|خبر|أخبار/i.test(k)) {
      newsUrls.push(...urls.slice(0, 3));
    }
  });

  async function scrapeListPage(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Find article links — look for repeating link patterns
      const links = [...doc.querySelectorAll("a[href]")]
        .map(a => absUrl(a.getAttribute("href")))
        .filter(href =>
          href.startsWith(BASE) &&
          href !== url &&
          href.replace(BASE, "").split("/").filter(Boolean).length >= 3
        );

      return [...new Set(links)];
    } catch (e) {
      return [];
    }
  }

  async function scrapeArticle(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Remove scripts and styles
      doc.querySelectorAll("script, style, nav, header, footer, .menu, .sidebar").forEach(el => el.remove());

      // Try multiple selectors for title
      const titleEl =
        doc.querySelector("h1.article-title, h1.post-title, h1.entry-title, .article-header h1, .content h1, main h1, h1") ||
        doc.querySelector("h2.article-title, h2.post-title");

      const title = titleEl?.textContent?.trim() || "";

      // Try multiple selectors for content
      const contentEl =
        doc.querySelector("article .content, .article-body, .post-content, .entry-content, main article, .content-area, #content main, article") ||
        doc.querySelector("main");

      const content = contentEl?.innerHTML?.trim() || "";
      const contentText = contentEl?.textContent?.trim() || "";

      // Try to find date
      const dateEl =
        doc.querySelector("time, .date, .post-date, .article-date, [class*='date'], [class*='time']");
      const dateStr = dateEl?.getAttribute("datetime") || dateEl?.textContent?.trim() || "";

      // Try to find featured image
      const imgEl =
        doc.querySelector("article img, .featured-image img, .post-thumbnail img, .article-image img, main img");
      const image = imgEl?.getAttribute("src") ? absUrl(imgEl.getAttribute("src")) : "";

      // Try to find summary/excerpt
      const summaryEl =
        doc.querySelector(".excerpt, .summary, .article-excerpt, meta[name='description']");
      const summary = summaryEl?.getAttribute("content") || summaryEl?.textContent?.trim() ||
        contentText.slice(0, 200);

      if (!title || title.length < 3) return null;

      return {
        titleAr: title,
        summaryAr: summary,
        contentAr: content,
        featuredImage: image,
        sourceUrl: url,
        publishedAt: dateStr || new Date().toISOString(),
        type: "NEWS",
        status: "PUBLISHED",
      };
    } catch (e) {
      return null;
    }
  }

  // Collect article URLs from listing pages
  let articleUrls = [];

  // First try current page (homepage) links
  const currentPageLinks = [...document.querySelectorAll("a[href]")]
    .map(a => absUrl(a.getAttribute("href")))
    .filter(href => {
      const path = href.replace(BASE, "");
      const parts = path.split("/").filter(Boolean);
      return href.startsWith(BASE) && parts.length >= 3 && parts[0] === "ar";
    });

  articleUrls.push(...currentPageLinks);

  // Then try news listing pages
  for (const url of newsUrls) {
    const links = await scrapeListPage(url);
    articleUrls.push(...links);
    await delay(500);
  }

  // Also try pagination: /ar/news?page=2 etc.
  for (let page = 2; page <= 5; page++) {
    for (const base of newsUrls.slice(0, 2)) {
      const links = await scrapeListPage(`${base}?page=${page}`);
      if (links.length === 0) break;
      articleUrls.push(...links);
      await delay(300);
    }
  }

  articleUrls = [...new Set(articleUrls)].slice(0, 100); // max 100 articles
  console.log(`\n🔗 Found ${articleUrls.length} article URLs to scrape`);

  // ─── Step 3: scrape each article ───────────────────────
  const articles = [];
  let i = 0;
  for (const url of articleUrls) {
    i++;
    if (i % 5 === 0) console.log(`  Scraping ${i}/${articleUrls.length}...`);
    const article = await scrapeArticle(url);
    if (article) articles.push(article);
    await delay(300); // polite delay
  }

  console.log(`\n✅ Scraped ${articles.length} articles`);

  // ─── Step 4: output JSON ────────────────────────────────
  const output = JSON.stringify(articles, null, 2);

  // Create download link
  const blob = new Blob([output], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "moc-content.json";
  a.click();

  console.log("\n✅ Done! تم تنزيل ملف moc-content.json");
  console.log("الخطوة التالية: node scripts/import-moc.mjs");

  return articles;
})();
