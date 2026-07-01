// Compress already-uploaded images in public/uploads (run once on the server for
// legacy uploads that predate the auto-compress-on-upload feature).
//
//   • Recompresses in place keeping the SAME filename + format so existing URLs
//     and DB references never break.
//   • Caps width at 2400px, quality 82 (JPEG/PNG/WebP). GIFs/PDFs/videos skipped.
//   • Backs up each original to ./uploads-backup/<filename> before overwriting.
//   • Updates the matching `media` row (size/width/height) so the admin library
//     stays accurate.
//   • Only adopts the compressed version when it is actually smaller.
//
// Usage (on the server, from the project root):
//   node --env-file=.env scripts/compress-uploads.mjs --dry-run   # preview only
//   node --env-file=.env scripts/compress-uploads.mjs             # apply
//
import sharp from "sharp";
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");
const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const BACKUP_DIR = join(process.cwd(), "uploads-backup");
const MAX_W = 2400;
const QUALITY = 82;
const HANDLED = new Set(["jpg", "jpeg", "png", "webp"]); // gif skipped to preserve animation

const prisma = new PrismaClient();
let totalBefore = 0, totalAfter = 0, changed = 0, skipped = 0;

async function run() {
  let files;
  try {
    files = readdirSync(UPLOAD_DIR);
  } catch {
    console.error(`Upload dir not found: ${UPLOAD_DIR}`);
    process.exit(1);
  }

  for (const f of files) {
    const p = join(UPLOAD_DIR, f);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (!st.isFile()) continue;

    const ext = f.toLowerCase().split(".").pop();
    if (!HANDLED.has(ext)) { skipped++; continue; }

    const before = st.size;
    let buffer, meta;
    try {
      buffer = readFileSync(p);
      meta = await sharp(buffer).metadata();
    } catch {
      console.log(`! ${f}: unreadable image, skipped`);
      skipped++;
      continue;
    }

    let pipeline = sharp(buffer, { failOn: "none" }).rotate();
    if (meta.width && meta.width > MAX_W) pipeline = pipeline.resize({ width: MAX_W });
    if (ext === "png")      pipeline = pipeline.png({ compressionLevel: 9, palette: true, quality: QUALITY });
    else if (ext === "webp") pipeline = pipeline.webp({ quality: QUALITY });
    else                     pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });

    let out;
    try { out = await pipeline.toBuffer(); } catch { skipped++; continue; }

    if (out.length >= before) {
      skipped++;
      continue; // already optimal
    }

    const newMeta = await sharp(out).metadata();
    totalBefore += before; totalAfter += out.length; changed++;
    console.log(`${DRY_RUN ? "[dry] " : ""}${f}: ${(before/1024).toFixed(0)}KB -> ${(out.length/1024).toFixed(0)}KB${meta.width > MAX_W ? ` (${meta.width}px -> ${MAX_W}px)` : ""}`);

    if (DRY_RUN) continue;

    // Backup original once, then overwrite, then sync DB.
    mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = join(BACKUP_DIR, f);
    if (!existsSync(backupPath)) copyFileSync(p, backupPath);
    writeFileSync(p, out);

    try {
      await prisma.media.updateMany({
        where: { filename: f },
        data: { size: out.length, width: newMeta.width ?? null, height: newMeta.height ?? null },
      });
    } catch (e) {
      console.log(`  (DB update failed for ${f}: ${e.message})`);
    }
  }

  console.log(
    `\n${DRY_RUN ? "[DRY RUN] would change" : "Changed"} ${changed} file(s), skipped ${skipped}.` +
    (changed ? `  ${(totalBefore/1024/1024).toFixed(2)}MB -> ${(totalAfter/1024/1024).toFixed(2)}MB (saved ${((totalBefore-totalAfter)/1024/1024).toFixed(2)}MB)` : "")
  );
  if (!DRY_RUN && changed) console.log(`Originals backed up in ${BACKUP_DIR}/`);
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
