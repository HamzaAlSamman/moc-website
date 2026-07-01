// Probe a single article to understand its RSC structure
const id = process.argv[2] || "3044f98c-4139-412e-833e-fb5a8ef55169";
const url = `https://moc.gov.sy/ar/news/${id}`;

const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
const html = await res.text();

// 1. Title (clean the suffix)
let title = html.match(/property="og:title"[^>]*content="([^"]+)"/)?.[1] || "";
title = title.replace(/\s*,?\s*خبر\s*\|\s*وزارة الثقافة\s*$/u, "").trim();
console.log("TITLE:", title);

// 2. Date - find "YYYY-MM-DD HH:MM م/ص" pattern
const dateMatch = html.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*([صم])/);
console.log("DATE:", dateMatch ? dateMatch[0] : "NOT FOUND");

// 3. All clean image URLs
const imgs = [...new Set(
  (html.match(/https:\/\/dashboard\.qmindtech-ai\.net\/uploads\/News\/[a-f0-9-]+\/[a-zA-Z0-9-]+\.[a-zA-Z]+/g) || [])
)];
console.log("IMAGES:", imgs.length);
imgs.forEach(i => console.log("  " + i));

// 4. Content - extract from RSC. Decode the flight data.
// The content paragraphs are in children":"...text..." patterns
const decoded = html
  .replace(/\\\\/g, "\\")
  .replace(/\\"/g, '"')
  .replace(/\\n/g, "\n");

// Find long Arabic text blocks (the article body)
const textBlocks = [...new Set(
  (decoded.match(/"children":"([؀-ۿ][^"]{60,})"/g) || [])
    .map(m => m.replace(/"children":"/, "").replace(/"$/, ""))
)];
console.log("\nCONTENT BLOCKS:", textBlocks.length);
textBlocks.slice(0, 5).forEach((t, i) => console.log(`  [${i}] ${t.slice(0, 150)}`));
