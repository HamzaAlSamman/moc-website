/**
 * probe-moc.mjs
 *
 * يفحص هيكل موقع moc.gov.sy ويطبع المعلومات اللازمة لبناء السكريبت الكامل.
 *
 * تشغيل:
 *   node scripts/probe-moc.mjs
 */

const BASE = "https://moc.gov.sy";
const PAGES_TO_PROBE = [
  "/ar",
  "/ar/news",
  "/ar/events",
  "/ar/achievements",
];

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ar,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractLinks(html, base) {
  const links = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (href.startsWith("/")) href = base + href;
    if (href.startsWith(base)) links.push(href);
  }
  return [...new Set(links)];
}

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function findPatterns(links) {
  const patterns = {};
  for (const link of links) {
    const path = link.replace(BASE, "");
    const segments = path.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const key = "/" + segments.slice(0, 2).join("/");
      patterns[key] = (patterns[key] || 0) + 1;
    }
  }
  return Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
}

async function probeOnePage(url) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`🔍 Probing: ${url}`);
  console.log("─".repeat(60));

  let html;
  try {
    html = await fetchHtml(url);
    console.log(`✅ Status: OK (${html.length} chars)`);
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return null;
  }

  const links = extractLinks(html, BASE);
  const patterns = findPatterns(links);

  console.log(`\n📌 Top link patterns found:`);
  patterns.forEach(([pattern, count]) => {
    console.log(`   ${count}x  ${pattern}`);
  });

  // Look for article/news-like links
  const articleLinks = links.filter(l =>
    /\/(news|article|post|akhbar|event|نشاط|خبر|فعالية).*\/\d+/i.test(l) ||
    /\/(news|article|post|event)\/[a-z0-9-]{5,}/i.test(l)
  );
  if (articleLinks.length) {
    console.log(`\n📰 Likely article links (${articleLinks.length} found):`);
    articleLinks.slice(0, 5).forEach(l => console.log(`   ${l}`));
  }

  // Show first article link for structure inspection
  const firstLink = links.find(l => {
    const path = l.replace(BASE, "");
    const segs = path.split("/").filter(Boolean);
    return segs.length >= 3;
  });

  if (firstLink && !articleLinks.length) {
    console.log(`\n🔗 Sample deep link: ${firstLink}`);
  }

  // Show snippet of page text
  console.log(`\n📄 Page text snippet:`);
  console.log(`   ${extractText(html)}`);

  // Look for pagination
  const hasNextPage = /rel=["']next["']|صفحة التالية|التالي|next page/i.test(html);
  console.log(`\n📖 Pagination detected: ${hasNextPage ? "YES" : "NO"}`);

  // Look for JSON/API data embedded in page
  const hasJsonData = html.includes("application/json") || html.includes("__NEXT_DATA__") || html.includes("window.__data");
  console.log(`🗄️  Embedded JSON data: ${hasJsonData ? "YES — might have an API!" : "NO"}`);

  if (hasJsonData && html.includes("__NEXT_DATA__")) {
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (match) {
      console.log(`\n🚀 Next.js site detected! Checking API routes...`);
      try {
        const data = JSON.parse(match[1]);
        console.log(`   buildId: ${data.buildId}`);
        console.log(`   page: ${data.page}`);
        if (data.props?.pageProps) {
          console.log(`   pageProps keys: ${Object.keys(data.props.pageProps).join(", ")}`);
        }
      } catch {}
    }
  }

  return html;
}

async function probeArticlePage(html) {
  const links = extractLinks(html, BASE);
  // Find a deep link that looks like an article
  const candidates = links.filter(l => {
    const path = l.replace(BASE, "");
    const segs = path.split("/").filter(Boolean);
    return segs.length >= 3 && (
      /\d{4,}/.test(path) ||
      segs.some(s => /^[a-z0-9-]{10,}$/.test(s))
    );
  });

  if (!candidates.length) return;

  const articleUrl = candidates[0];
  console.log(`\n${"─".repeat(60)}`);
  console.log(`🔍 Probing sample article: ${articleUrl}`);
  console.log("─".repeat(60));

  let articleHtml;
  try {
    articleHtml = await fetchHtml(articleUrl);
  } catch (e) {
    console.log(`❌ Failed: ${e.message}`);
    return;
  }

  // Try to find title, date, content elements
  const titleMatch = articleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const dateMatch  = articleHtml.match(/\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/);
  const imgMatch   = articleHtml.match(/src=["']([^"']+\.(jpg|jpeg|png|webp)[^"']*)["']/i);

  if (titleMatch) console.log(`   Title tag: <h1>${extractText(titleMatch[0])}</h1>`);
  if (dateMatch)  console.log(`   Date found: ${dateMatch[0]}`);
  if (imgMatch)   console.log(`   Image found: ${imgMatch[1]}`);

  // Find main content area
  const contentSelectors = ["article", "main", ".content", ".post-content", ".article-body", "#content"];
  console.log(`\n   Looking for content containers...`);
  for (const sel of contentSelectors) {
    const re = new RegExp(`<${sel.replace(".", "[^>]*class=[^>]*")}[^>]*>`, "i");
    if (re.test(articleHtml) || articleHtml.includes(sel)) {
      console.log(`   ✅ Found: ${sel}`);
    }
  }
}

async function main() {
  console.log("🕷️  MOC.GOV.SY Structure Probe");
  console.log("=".repeat(60));
  console.log("سأفحص هيكل الموقع لفهم طريقة استخراج المحتوى\n");

  let homepageHtml = null;

  for (const page of PAGES_TO_PROBE) {
    const html = await probeOnePage(BASE + page);
    if (page === "/ar" && html) homepageHtml = html;
    await new Promise(r => setTimeout(r, 1000)); // polite delay
  }

  if (homepageHtml) {
    await probeArticlePage(homepageHtml);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ Probe complete!");
  console.log("=".repeat(60));
  console.log(`
📋 الخطوة التالية:
   شارك output هذا السكريبت وسأكتب لك scrape-moc.mjs الكامل
   بناءً على هيكل الموقع الفعلي.
  `);
}

main().catch(console.error);
