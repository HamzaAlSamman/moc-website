/**
 * browser-about.js — سحب صفحة "حول الوزارة" كاملة
 *
 * 1. افتح https://moc.gov.sy/ar في المتصفح
 * 2. F12 → Console
 * 3. الصق هذا الكود واضغط Enter
 * 4. سيتم تحميل moc-about.json
 */
(async () => {
  const BASE  = location.origin;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  function absUrl(href) {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    if (href.startsWith("//"))   return "https:" + href;
    if (href.startsWith("/"))    return BASE + href;
    return "";
  }

  async function fetchDoc(url) {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return { doc: new DOMParser().parseFromString(html, "text/html"), html };
  }

  // ── Try common about-page URLs ─────────────────────────
  const candidates = [
    `${BASE}/ar/about`,
    `${BASE}/ar/about-ministry`,
    `${BASE}/ar/about-us`,
    `${BASE}/ar/وزارة`,
    `${BASE}/ar/عن-الوزارة`,
    `${BASE}/ar/من-نحن`,
    `${BASE}/ar/page/about`,
  ];

  // Also check nav links
  document.querySelectorAll("nav a, header a, .menu a").forEach(a => {
    const href  = a.getAttribute("href") || "";
    const text  = a.textContent?.trim() || "";
    const full  = absUrl(href);
    if (full && /عن|حول|وزارة|about|من نحن/i.test(text + href)) {
      candidates.unshift(full);
    }
  });

  console.log("🔍 Looking for about page...");

  let aboutDoc  = null;
  let aboutUrl  = null;
  let aboutHtml = null;

  for (const url of [...new Set(candidates)]) {
    try {
      console.log(`  Trying: ${url}`);
      const { doc, html } = await fetchDoc(url);
      const bodyText = doc.body?.textContent || "";
      if (bodyText.length > 500) {
        aboutDoc  = doc;
        aboutUrl  = url;
        aboutHtml = html;
        console.log(`✅ Found about page at: ${url}`);
        break;
      }
    } catch {}
    await delay(300);
  }

  if (!aboutDoc) {
    console.error("❌ Could not find about page. Try navigating to it manually first.");
    return;
  }

  // ── Extract structured content ─────────────────────────
  aboutDoc.querySelectorAll("script, style, nav, header, footer, .menu, .sidebar, .breadcrumb").forEach(e => e.remove());

  function extractSections(doc) {
    const sections = [];
    const headings = [...doc.querySelectorAll("h1, h2, h3")];

    headings.forEach((h, idx) => {
      const title = h.textContent?.trim();
      if (!title || title.length < 3) return;

      // Get content between this heading and the next
      const content = [];
      let el = h.nextElementSibling;
      const nextH = headings[idx + 1];
      while (el && el !== nextH) {
        const text = el.textContent?.trim();
        if (text && text.length > 10) content.push({ tag: el.tagName.toLowerCase(), text, html: el.outerHTML });
        el = el.nextElementSibling;
      }

      sections.push({ title, tag: h.tagName.toLowerCase(), content });
    });

    return sections;
  }

  function extractImages(doc) {
    return [...doc.querySelectorAll("img")]
      .map(img => ({
        src:   absUrl(img.dataset.src || img.dataset.lazySrc || img.getAttribute("src") || ""),
        alt:   img.alt || "",
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
      }))
      .filter(img => img.src && !img.src.includes("logo") && !img.src.includes("icon") && !img.src.includes("arrow"));
  }

  function extractStats(doc) {
    // Look for numbers/stats like "١٢٠ موظف", "٥٠ مديرية", etc.
    const stats = [];
    const text  = doc.body.textContent;
    const re    = /(\d+[\d٠-٩,،]*)\s*([؀-ۿ\s]{2,30})/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (parseInt(m[1]) > 0) stats.push({ number: m[1], label: m[2].trim() });
    }
    return stats.slice(0, 20);
  }

  function extractLinks(doc) {
    return [...doc.querySelectorAll("a[href]")]
      .map(a => ({ text: a.textContent?.trim(), href: absUrl(a.getAttribute("href")) }))
      .filter(l => l.text && l.href && l.href.startsWith(BASE));
  }

  const ogImage = aboutDoc.querySelector('meta[property="og:image"]')?.content;
  const ogDesc  = aboutDoc.querySelector('meta[property="og:description"]')?.content ||
                  aboutDoc.querySelector('meta[name="description"]')?.content;

  const mainEl = aboutDoc.querySelector("main, article, .content, #content, .page-content");

  const result = {
    url:         aboutUrl,
    title:       aboutDoc.querySelector("h1")?.textContent?.trim() ||
                 aboutDoc.querySelector('meta[property="og:title"]')?.content || "حول الوزارة",
    description: ogDesc || "",
    heroImage:   absUrl(ogImage || ""),
    fullHtml:    mainEl?.innerHTML || aboutDoc.body.innerHTML,
    sections:    extractSections(mainEl || aboutDoc.body),
    images:      extractImages(mainEl || aboutDoc.body),
    stats:       extractStats(mainEl || aboutDoc.body),
    links:       extractLinks(mainEl || aboutDoc.body),
    scrapedAt:   new Date().toISOString(),
  };

  console.log(`📄 Title: ${result.title}`);
  console.log(`🖼  Images: ${result.images.length}`);
  console.log(`📌 Sections: ${result.sections.length}`);
  console.log(`📊 Stats found: ${result.stats.length}`);

  // ── Download JSON ──────────────────────────────────────
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "moc-about.json";
  a.click();

  console.log("✅ تم تحميل moc-about.json — ضعه في مجلد المشروع");
})();
