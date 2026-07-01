// Recompress large source images in place, keeping a backup of each original
// under public/images/_originals/. Targets JPG/PNG > 700KB, caps width at 2400px.
import sharp from "sharp";
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join, relative } from "path";

const dirs = ["public/images", "public/images/drive-photos"];
const BACKUP_ROOT = "public/images/_originals";
const THRESHOLD = 700 * 1024;
const MAX_W = 2400;
let totalBefore = 0, totalAfter = 0;

for (const dir of dirs) {
  let files;
  try { files = readdirSync(dir); } catch { continue; }
  for (const f of files) {
    const p = join(dir, f);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (!st.isFile()) continue;
    const ext = f.toLowerCase().split(".").pop();
    if (!["jpg", "jpeg", "png"].includes(ext)) continue;
    if (st.size < THRESHOLD) continue;

    // backup preserving relative path
    const rel = relative("public/images", p);
    const backupPath = join(BACKUP_ROOT, rel);
    mkdirSync(join(backupPath, ".."), { recursive: true });
    if (!existsSync(backupPath)) copyFileSync(p, backupPath);

    const before = st.size;
    // Read into a buffer so sharp does not hold a lock on the file we overwrite (Windows).
    const input = readFileSync(p);
    const img = sharp(input, { failOn: "none" });
    const meta = await img.metadata();
    let pipeline = img.rotate();
    if (meta.width > MAX_W) pipeline = pipeline.resize({ width: MAX_W });

    const buf = ext === "png"
      ? await pipeline.png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer()
      : await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();

    if (buf.length < before) {
      writeFileSync(p, buf);
      totalBefore += before; totalAfter += buf.length;
      console.log(`${rel}: ${(before/1024).toFixed(0)}KB -> ${(buf.length/1024).toFixed(0)}KB (${meta.width}x${meta.height}${meta.width>MAX_W?` -> w${MAX_W}`:""})`);
    } else {
      console.log(`${rel}: skipped (not smaller)`);
    }
  }
}
console.log(`\nTOTAL: ${(totalBefore/1024/1024).toFixed(2)}MB -> ${(totalAfter/1024/1024).toFixed(2)}MB  (saved ${((totalBefore-totalAfter)/1024/1024).toFixed(2)}MB)`);
console.log(`Backups in ${BACKUP_ROOT}/`);
