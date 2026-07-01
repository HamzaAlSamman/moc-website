// Full article extractor — title, date, content, all images
const id = process.argv[2] || "cb014b16-587a-4a07-8eb5-12e20ed4339e";

function extract(html, articleId) {
  // ── Title (strip ",خبر | وزارة الثقافة" suffix) ──
  let title = html.match(/property="og:title"[^>]*content="([^"]+)"/)?.[1] || "";
  title = title.replace(/\s*,?\s*خبر\s*\|\s*وزارة الثقافة\s*$/u, "").trim();

  // ── Date "YYYY-MM-DD HH:MM م/ص" ──
  const dm = html.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*([صم])/);
  let publishedAt = null;
  if (dm) {
    const [, date, time, ampm] = dm;
    let [h, m] = time.split(":").map(Number);
    if (ampm === "م" && h < 12) h += 12;
    if (ampm === "ص" && h === 12) h = 0;
    publishedAt = `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`;
  }

  // ── Content: find \"content\":\"...\" (deeply escaped) ──
  // The flight payload escapes content as \\\"content\\\":\\\"...\\\"
  let content = "";
  const cIdx = html.indexOf('content\\\\\\":\\\\\\"');
  if (cIdx > -1) {
    const start = cIdx + 'content\\\\\\":\\\\\\"'.length;
    // Find the closing \\\" that ends the content value
    let end = start;
    while (end < html.length) {
      // Look for \\\\\\" not preceded by another backslash sequence
      if (html.slice(end, end + 6) === '\\\\\\",\\' || html.slice(end, end + 6) === '\\\\\\"}' ) break;
      end++;
    }
    content = html.slice(start, end);
  }

  // Decode the content
  content = content
    .replace(/\\\\\\\\r\\\\\\\\n/g, "\n")   // \r\n
    .replace(/\\\\\\\\n/g, "\n")
    .replace(/\\\\\\"/g, '"')
    .replace(/\\\\\\\\/g, "")
    .replace(/^اقرأ خبر «\s*/u, "")   // strip prefix
    .replace(/»\s*$/u, "")            // strip trailing »
    .trim();

  // ── All images for THIS article ──
  const imgRe = new RegExp(`uploads/News/${articleId}/[a-zA-Z0-9-]+\\.[a-zA-Z]+`, "g");
  const imgs = [...new Set((html.match(imgRe) || []))]
    .map(p => "https://dashboard.qmindtech-ai.net/" + p);

  return { title, publishedAt, content, images: imgs };
}

const res = await fetch(`https://moc.gov.sy/ar/news/${id}`, { headers: { "User-Agent": "Mozilla/5.0" } });
const html = await res.text();
const a = extract(html, id);

console.log("TITLE:", a.title);
console.log("DATE :", a.publishedAt);
console.log("IMAGES:", a.images.length);
a.images.forEach(i => console.log("  " + i));
console.log("\nCONTENT (" + a.content.length + " chars):");
console.log(a.content.slice(0, 600));
