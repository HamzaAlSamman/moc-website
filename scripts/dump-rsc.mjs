// Dump raw RSC structure around content/images
const id = process.argv[2] || "cb014b16-587a-4a07-8eb5-12e20ed4339e";
const res = await fetch(`https://moc.gov.sy/ar/news/${id}`, { headers: { "User-Agent": "Mozilla/5.0" } });
const html = await res.text();

// Decode flight escaping progressively
const decoded = html
  .replace(/\\\\/g, "")   // temp marker for literal backslash
  .replace(/\\"/g, '"')
  .replace(/\\n/g, "\n")
  .replace(//g, "\\");

// Find the article description / content area
// Look for "description" or "content" keys
console.log("=== Searching for content keys ===");
["description", "content", "body", "text", "Description", "Content", "Body"].forEach(key => {
  const re = new RegExp(`"${key}":"([^"]{40,})"`, "g");
  let m;
  while ((m = re.exec(decoded)) !== null) {
    console.log(`[${key}] ${m[1].slice(0, 200)}`);
    break;
  }
});

console.log("\n=== All image references ===");
const imgs = [...new Set((decoded.match(/uploads\/News\/[a-f0-9-]+\/[a-zA-Z0-9-]+\.[a-zA-Z]+/g) || []))];
imgs.forEach(i => console.log("  " + i));

console.log("\n=== Long Arabic blocks (raw) ===");
const blocks = [...new Set((decoded.match(/[؀-ۿ][؀-ۿ\s،.""'':\-()0-9]{80,}/g) || []))];
blocks.slice(0, 8).forEach((b, i) => console.log(`[${i}] (${b.length}) ${b.slice(0, 180)}`));
