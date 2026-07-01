/**
 * download-images.mjs
 * يحمّل كل صور الأخبار محلياً إلى /public/uploads/
 * ويسجّلها في جدول media
 * ويحدّث مسارات الصور في الـ posts
 *
 * تشغيل: node scripts/download-images.mjs
 */

import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir, access } from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");
const DELAY = 300;
const delay = ms => new Promise(r => setTimeout(r, ms));

const prisma = new PrismaClient();

await mkdir(UPLOAD_DIR, { recursive: true });

// ── Get admin user ──────────────────────────────────
const admin = await prisma.user.findFirst({
  where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
});
if (!admin) { console.error("No admin user found"); process.exit(1); }
console.log(`✅ Using uploader: ${admin.email}\n`);

// ── Collect all unique external images ──────────────
const posts = await prisma.post.findMany({
  select: { id: true, featuredImage: true, gallery: true },
});

const urlToLocalMap = new Map(); // externalUrl → /uploads/filename
let downloaded = 0, skipped = 0, failed = 0;

// Build unique URL list
const uniqueUrls = new Set();
posts.forEach(post => {
  if (post.featuredImage?.startsWith("http")) uniqueUrls.add(post.featuredImage);
  if (post.gallery) {
    try { JSON.parse(post.gallery).forEach(u => { if (u?.startsWith("http")) uniqueUrls.add(u); }); }
    catch {}
  }
});

console.log(`📦 ${uniqueUrls.size} unique external images to download\n`);

// ── Download each image ─────────────────────────────
let i = 0;
for (const url of uniqueUrls) {
  i++;
  if (i % 20 === 0) console.log(`  [${i}/${uniqueUrls.size}] ✅${downloaded} ⏭${skipped} ❌${failed}`);

  try {
    // Extract extension from URL
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath).toLowerCase() || ".jpg";
    // Use last 2 path segments as filename to keep it unique
    const parts = urlPath.split("/").filter(Boolean);
    const baseName = parts.slice(-2).join("-").replace(/[^a-zA-Z0-9\-_.]/g, "_");
    const filename = `moc-${baseName}${ext.includes(".") ? "" : ext}`;
    const localPath = path.join(UPLOAD_DIR, filename);
    const publicUrl = `/uploads/${filename}`;

    // Check if already downloaded
    try {
      await access(localPath);
      urlToLocalMap.set(url, publicUrl);
      skipped++;
      continue;
    } catch {}

    // Download
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) { failed++; continue; }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) { failed++; continue; } // skip tiny/empty responses

    await writeFile(localPath, buffer);

    // Register in media table (skip if already exists)
    const existing = await prisma.media.findFirst({ where: { url: publicUrl } });
    if (!existing) {
      await prisma.media.create({
        data: {
          filename,
          originalName: filename,
          url: publicUrl,
          mimeType: ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
                  : ext === ".png" ? "image/png"
                  : ext === ".webp" ? "image/webp"
                  : ext === ".gif" ? "image/gif"
                  : "image/jpeg",
          size: buffer.length,
          uploadedById: admin.id,
        },
      });
    }

    urlToLocalMap.set(url, publicUrl);
    downloaded++;
    await delay(DELAY);

  } catch (e) {
    failed++;
  }
}

console.log(`\n${"═".repeat(50)}`);
console.log(`📥 Downloaded : ${downloaded}`);
console.log(`⏭  Skipped    : ${skipped} (already exist)`);
console.log(`❌ Failed     : ${failed}`);
console.log("═".repeat(50));

if (urlToLocalMap.size === 0) {
  console.log("Nothing to update.");
  await prisma.$disconnect();
  process.exit(0);
}

// ── Update posts with local URLs ─────────────────────
console.log(`\n🔄 Updating ${posts.length} posts with local image paths...`);

let updated = 0;
for (const post of posts) {
  const updates = {};

  // featuredImage
  if (post.featuredImage && urlToLocalMap.has(post.featuredImage)) {
    updates.featuredImage = urlToLocalMap.get(post.featuredImage);
  }

  // gallery
  if (post.gallery) {
    try {
      const gallery = JSON.parse(post.gallery);
      const newGallery = gallery.map(u => urlToLocalMap.get(u) || u);
      if (JSON.stringify(newGallery) !== post.gallery) {
        updates.gallery = JSON.stringify(newGallery);
      }
    } catch {}
  }

  if (Object.keys(updates).length > 0) {
    await prisma.post.update({ where: { id: post.id }, data: updates });
    updated++;
  }
}

console.log(`✅ Updated ${updated} posts with local paths`);
console.log(`\n✅ Done! All images are now in /public/uploads/`);
console.log(`📁 Media library now has all images registered.`);

await prisma.$disconnect();
