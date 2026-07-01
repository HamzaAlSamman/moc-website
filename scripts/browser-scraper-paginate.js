/**
 * browser-scraper-paginate.js — يسحب كل الأخبار: عربي + إنجليزي + صور + سوشيال
 *
 * 1. افتح https://moc.gov.sy/ar/news في المتصفح
 * 2. F12 → Console
 * 3. الصق هذا الكود واضغط Enter
 * ⏱ ~10-15 دقيقة لـ 416 خبر
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
      const src = img.dataset.src || img.dataset.lazySrc || img.getAttribute("src") || "";
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
      doc.querySelector(".date,.post-date,.article-date,.news-date,.article__date,[class*='date'],[class*='time']")?.textContent?.trim() ||
      ""
    );
  }

  function getSocialLinks(doc) {
    const links = { facebookUrl: "", instagramUrl: "", twitterUrl: "", youtubeUrl: "" };
    doc.querySelectorAll("a[href]").forEach(a => {
      const href = a.href || "";
      if (/facebook\.com\/(?!sharer)/i.test(href) && !links.facebookUrl)  links.facebookUrl  = href;
      if (/instagram\.com\//i.test(href) && !links.instagramUrl)           links.instagramUrl = href;
      if (/twitter\.com\/|x\.com\//i.test(href) && !links.twitterUrl)     links.twitterUrl   = href;
      if (/youtube\.com\//i.test(href) && !links.youtubeUrl)               links.youtubeUrl   = href;
    });
    return links;
  }

  function getNextPageUrl(doc) {
    const rel = doc.querySelector('a[rel="next"]');
    if (rel) return absUrl(rel.getAttribute("href"));
    for (const a of doc.querySelectorAll("a")) {
      const txt  = a.textContent?.trim();
      const href = a.getAttribute("href");
      if (href && /^(التالي|التالية|next|›|»|>>)$/i.test(txt))
        return absUrl(href);
    }
    const active = doc.querySelector(".pagination .active a, .page-item.active a, [aria-current='page']");
    if (active) {
      const num  = parseInt(active.textContent?.trim());
      if (!isNaN(num)) {
        const next = [...doc.querySelectorAll("a")].find(a => a.textContent?.trim() === String(num + 1));
        if (next) return absUrl(next.getAttribute("href"));
      }
    }
    return null;
  }

  function getArticleLinks(doc, listingUrl) {
    return [...doc.querySelectorAll("a[href]")]
      .map(a => absUrl(a.getAttribute("href")))
      .filter(href => {
        if (!href.startsWith(BASE)) return false;
        const path = href.replace(BASE, "");
        const segs = path.split("/").filter(Boolean);
        return (
          segs.length >= 3 && segs[0] === "ar" &&
          href !== listingUrl &&
          !href.includes("?page=") && !href.includes("/page/") &&
          !/\/(news|events|achievements|about)\/?$/.test(path)
        );
      });
  }

  // ── Phase 1: walk all listing pages ─────────────────
  console.log("📋 Phase 1: Walking all news pages...\n");

  const articleUrls = new Set();
  let currentUrl = `${BASE}/ar/news`;
  let page = 1, noProgressStreak = 0;

  while (currentUrl) {
    const doc = await fetchDoc(currentUrl);
    if (!doc) { console.log(`❌ Failed page ${page}`); break; }

    const links  = getArticleLinks(doc, currentUrl);
    const before = articleUrls.size;
    links.forEach(l => articleUrls.add(l));
    const added  = articleUrls.size - before;

    console.log(`  Page ${page}: +${added} → total ${articleUrls.size}  (${currentUrl})`);

    if (added === 0) {
      if (++noProgressStreak >= 2) { console.log("  ⚠ Stopping."); break; }
    } else { noProgressStreak = 0; }

    const nextUrl = getNextPageUrl(doc);
    if (!nextUrl || nextUrl === currentUrl || page >= 30) { console.log(`  ✅ Last page (${page})`); break; }
    currentUrl = nextUrl;
    page++;
    await delay(600);
  }

  console.log(`\n✅ Phase 1: ${articleUrls.size} articles across ${page} pages\n`);
  if (!articleUrls.size) return;

  // ── Phase 2: scrape each article (AR + EN) ───────────
  console.log(`📰 Phase 2: Scraping ${articleUrls.size} articles (Arabic + English)...`);
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
      // ── Arabic version ──
      const docAr = await fetchDoc(url);
      if (!docAr) continue;

      docAr.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar,.breadcrumb,.share,.related,.comments").forEach(e => e.remove());

      const titleAr =
        docAr.querySelector('meta[property="og:title"]')?.content?.trim() ||
        docAr.querySelector("h1")?.textContent?.trim() || "";
      if (!titleAr || titleAr.length < 5) continue;

      const summaryAr =
        docAr.querySelector('meta[name="description"]')?.content?.trim() ||
        docAr.querySelector('meta[property="og:description"]')?.content?.trim() || "";

      const contentElAr = docAr.querySelector(
        ".article-body,.post-content,.entry-content,.content-area,article .content,main article,article,main"
      );

      const dateStr      = getDate(docAr);
      const featuredImg  = bestImage(docAr);
      const socialLinks  = getSocialLinks(docAr);

      // ── English version (try /en/ URL) ──
      let titleEn = "", summaryEn = "", contentElEn = null;

      const enUrl = url.replace("/ar/", "/en/");
      if (enUrl !== url) {
        await delay(200);
        const docEn = await fetchDoc(enUrl);
        if (docEn) {
          docEn.querySelectorAll("script,style,nav,header,footer,.menu,.sidebar,.breadcrumb,.share,.related").forEach(e => e.remove());

          titleEn =
            docEn.querySelector('meta[property="og:title"]')?.content?.trim() ||
            docEn.querySelector("h1")?.textContent?.trim() || "";

          // Make sure it's actually different (not the Arabic version repeated)
          if (titleEn === titleAr) titleEn = "";

          summaryEn =
            docEn.querySelector('meta[name="description"]')?.content?.trim() ||
            docEn.querySelector('meta[property="og:description"]')?.content?.trim() || "";

          if (titleEn) {
            contentElEn = docEn.querySelector(
              ".article-body,.post-content,.entry-content,.content-area,article .content,main article,article,main"
            );
          }
        }
      }

      articles.push({
        titleAr,
        titleEn:       titleEn   || null,
        summaryAr:     summaryAr || contentElAr?.textContent?.trim().slice(0, 250) || "",
        summaryEn:     summaryEn || null,
        contentAr:     contentElAr?.innerHTML?.trim() || "",
        contentEn:     contentElEn?.innerHTML?.trim() || null,
        featuredImage: featuredImg,
        sourceUrl:     url,
        publishedAt:   dateStr || new Date().toISOString(),
        type:          "NEWS",
        status:        "PUBLISHED",
        ...socialLinks,
      });
    } catch (e) {
      console.warn(`  ⚠ Error on ${url}:`, e.message);
    }

    await delay(400);
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  const withEn  = articles.filter(a => a.titleEn).length;
  const withImg = articles.filter(a => a.featuredImage).length;
  const withFb  = articles.filter(a => a.facebookUrl).length;
  const withIg  = articles.filter(a => a.instagramUrl).length;

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Done in ${Math.floor(elapsed/60)}m ${elapsed%60}s`);
  console.log(`   Scraped        : ${articles.length}`);
  console.log(`   With English   : ${withEn}`);
  console.log(`   With images    : ${withImg}`);
  console.log(`   With Facebook  : ${withFb}`);
  console.log(`   With Instagram : ${withIg}`);
  console.log("═".repeat(50));

  const blob = new Blob([JSON.stringify(articles, null, 2)], { type: "application/json" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "moc-content-full.json";
  a.click();
  console.log("\n✅ تم تحميل moc-content-full.json");
  console.log("الخطوة التالية: node scripts/import-moc.mjs moc-content-full.json");
})();
