/**
 * browser-about-full.js
 *
 * يسحب صفحة "حول الوزارة" كاملة مع HTML + CSS + الصور
 *
 * كيف تستخدمه:
 * 1. افتح https://moc.gov.sy/ar/about (أو أي صفحة حول الوزارة) بالمتصفح مع VPN سوري
 * 2. تأكد أن الصفحة حُمّلت كاملاً
 * 3. F12 → Console
 * 4. الصق هذا الكود كاملاً واضغط Enter
 * 5. سيتحمّل ملف moc-about-full.json تلقائياً
 * 6. ضع الملف في مجلد المشروع (بجانب package.json)
 */
(async () => {
  const BASE  = location.origin;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  console.log("🚀 بدأ سحب صفحة حول الوزارة...");

  // ── 1. تحديد الصفحة الحالية أو البحث عنها ──────────────
  let aboutDoc  = document;
  let aboutUrl  = location.href;

  const isAboutPage = /about|حول|عن-الوزارة|من-نحن|وزارة/i.test(location.pathname + location.search);

  if (!isAboutPage) {
    console.log("🔍 البحث عن صفحة حول الوزارة في روابط التنقل...");
    const navLinks = [...document.querySelectorAll("nav a, header a, .menu a, .navbar a")];
    const aboutLink = navLinks.find(a => /حول|عن|وزارة|about|من نحن/i.test(a.textContent + a.href));

    if (aboutLink) {
      console.log(`✅ وجدت الرابط: ${aboutLink.href}`);
      try {
        const res = await fetch(aboutLink.href, { credentials: "same-origin" });
        const html = await res.text();
        const parser = new DOMParser();
        aboutDoc = parser.parseFromString(html, "text/html");
        aboutUrl = aboutLink.href;
      } catch (e) {
        console.warn("⚠️ تعذّر تحميل الصفحة من الرابط، سأستخدم الصفحة الحالية");
      }
    } else {
      console.log("⚠️ تعذّر إيجاد رابط 'حول الوزارة'. سأسحب الصفحة الحالية.");
    }
  }

  // ── 2. استخراج CSS كاملاً ───────────────────────────────
  console.log("🎨 استخراج CSS...");

  const inlinedStyles = [];

  // جمع كل الـ stylesheets
  for (const sheet of document.styleSheets) {
    try {
      const rules = [...sheet.cssRules].map(r => r.cssText).join("\n");
      inlinedStyles.push(rules);
    } catch {
      // Cross-origin stylesheet - جرّب fetch
      if (sheet.href) {
        try {
          const res = await fetch(sheet.href);
          const text = await res.text();
          inlinedStyles.push(text);
        } catch {}
      }
    }
  }

  // ── 3. استخراج HTML الكامل للمحتوى الرئيسي ─────────────
  console.log("📄 استخراج HTML...");

  // نحاول نأخذ المحتوى الرئيسي فقط (بدون header/footer)
  const mainSelectors = [
    "main",
    "#main",
    ".main-content",
    "article",
    ".page-content",
    ".content-area",
    "#content",
    ".container",
  ];

  let mainEl = null;
  for (const sel of mainSelectors) {
    mainEl = aboutDoc.querySelector(sel);
    if (mainEl && mainEl.textContent.trim().length > 200) break;
  }

  // إذا ما لقينا main واضح، خذ كل الـ body
  const htmlContent = mainEl
    ? mainEl.outerHTML
    : aboutDoc.body.innerHTML;

  // ── 4. استخراج الصور ────────────────────────────────────
  console.log("🖼️  استخراج الصور...");

  function absUrl(href) {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    if (href.startsWith("//"))   return "https:" + href;
    if (href.startsWith("/"))    return BASE + href;
    return "";
  }

  const images = [];
  const seenSrcs = new Set();

  // صور من الصفحة الحالية (المُعرضة في المتصفح - أدق)
  document.querySelectorAll("img").forEach(img => {
    const src = absUrl(
      img.dataset.src || img.dataset.lazySrc || img.currentSrc || img.src || ""
    );
    if (src && !seenSrcs.has(src)) {
      seenSrcs.add(src);
      const rect = img.getBoundingClientRect();
      images.push({
        src,
        alt: img.alt || "",
        width: img.naturalWidth || Math.round(rect.width),
        height: img.naturalHeight || Math.round(rect.height),
        role: img.closest("header, nav") ? "ui"
          : (img.naturalWidth > 400 || rect.width > 400) ? "hero"
          : "content",
      });
    }
  });

  // صور CSS background-image
  document.querySelectorAll("*").forEach(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    const match = bg?.match(/url\(["']?([^"')]+)["']?\)/);
    if (match) {
      const src = absUrl(match[1]);
      if (src && !seenSrcs.has(src) && !src.startsWith("data:")) {
        seenSrcs.add(src);
        images.push({ src, alt: "", width: 0, height: 0, role: "background" });
      }
    }
  });

  // ── 5. استخراج النصوص المنظّمة ──────────────────────────
  console.log("📝 استخراج النصوص...");

  const targetDoc = mainEl || aboutDoc.body;
  const clone = targetDoc.cloneNode(true);
  clone.querySelectorAll("script, style, noscript, svg").forEach(e => e.remove());

  const sections = [];
  const headings = [...clone.querySelectorAll("h1, h2, h3, h4")];

  if (headings.length > 0) {
    headings.forEach((h, i) => {
      const title = h.textContent.trim();
      if (!title) return;
      const content = [];
      let el = h.nextElementSibling;
      const nextH = headings[i + 1];
      while (el && el !== nextH) {
        const text = el.textContent.trim();
        if (text.length > 5) {
          content.push({ tag: el.tagName.toLowerCase(), text, html: el.outerHTML });
        }
        el = el.nextElementSibling;
      }
      sections.push({ title, tag: h.tagName.toLowerCase(), content });
    });
  } else {
    // صفحة بدون عناوين — خذ الفقرات
    clone.querySelectorAll("p, li, td").forEach(el => {
      const text = el.textContent.trim();
      if (text.length > 20) {
        sections.push({ title: "", tag: el.tagName.toLowerCase(), content: [{ tag: el.tagName.toLowerCase(), text, html: el.outerHTML }] });
      }
    });
  }

  // ── 6. الـ Meta والـ OG tags ────────────────────────────
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
  const ogDesc  = document.querySelector('meta[property="og:description"]')?.content
               || document.querySelector('meta[name="description"]')?.content;
  const ogImage = document.querySelector('meta[property="og:image"]')?.content;

  const title = document.querySelector("h1")?.textContent?.trim()
             || document.title?.split("|")[0]?.trim()
             || ogTitle
             || "حول الوزارة";

  // ── 7. استخراج الأقسام الفرعية (tabs/accordion) ─────────
  const tabs = [];
  document.querySelectorAll("[role='tab'], .tab, .nav-tab, .accordion-header, .panel-title").forEach(tab => {
    const text = tab.textContent.trim();
    if (text.length > 2) tabs.push(text);
  });

  // ── 8. استخراج الـ Colors من CSS variables ──────────────
  const rootStyles = getComputedStyle(document.documentElement);
  const colorVars = {};
  ["--primary", "--secondary", "--accent", "--bg", "--text", "--dark", "--light",
   "--color-primary", "--color-secondary", "--theme-color"].forEach(v => {
    const val = rootStyles.getPropertyValue(v).trim();
    if (val) colorVars[v] = val;
  });

  // ── 9. تجميع كل البيانات ────────────────────────────────
  const result = {
    url:          aboutUrl,
    title,
    description:  ogDesc || "",
    heroImage:    absUrl(ogImage || images.find(i => i.role === "hero")?.src || ""),
    scrapedAt:    new Date().toISOString(),
    sections,
    images:       images.filter(i => i.role !== "ui"),
    tabs,
    colorVars,
    fullHtml:     htmlContent,
    cssBundle:    inlinedStyles.join("\n\n/* === next stylesheet === */\n\n"),
    meta: {
      lang:  document.documentElement.lang || "ar",
      title: document.title,
      ogTitle,
      ogDesc,
      ogImage: absUrl(ogImage || ""),
    },
  };

  console.log(`📄 العنوان: ${result.title}`);
  console.log(`🖼️  الصور: ${result.images.length}`);
  console.log(`📌 الأقسام: ${result.sections.length}`);
  console.log(`🎨 CSS: ${Math.round(result.cssBundle.length / 1024)} KB`);

  // ── 10. تحميل الملف ─────────────────────────────────────
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "moc-about-full.json";
  a.click();

  console.log("✅ تم تحميل moc-about-full.json — ضعه في مجلد المشروع وشغّل:");
  console.log("   node scripts/build-about-page.mjs moc-about-full.json");
})();
