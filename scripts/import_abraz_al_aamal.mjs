import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const baseDir = "f:/تطبيقات انا عم اعملها/MOC/moc-website/ابرز الاعمال";
const destBaseDir = "f:/تطبيقات انا عم اعملها/MOC/moc-website/public/uploads/abraz-al-aamal";

const monthNamesAr = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const monthNamesEn = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getSlideNumber(filename) {
  // If filename starts with "1 (" or is of form "1 (N)"
  if (/^1\s*\(\d+\)/.test(filename)) {
    const match = filename.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }
  // If it's MOFC Achievments N
  if (/MOFC/i.test(filename)) {
    const match = filename.match(/MOFC\s+Achievments\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }
  // Otherwise, just extract the first number in the filename
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getMediaType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if ([".mp4", ".mov", ".webm", ".avi", ".quicktime", ".m4v"].includes(ext)) {
    return "video";
  }
  return "image";
}

async function main() {
  console.log("🧹 Deleting old achievements from database...");
  const deleteRes = await prisma.post.deleteMany({
    where: { type: "ACHIEVEMENT" }
  });
  console.log(`✅ Deleted ${deleteRes.count} old achievements.`);

  // Find an admin user to assign as author
  let author = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!author) {
    throw new Error("No admin user found in database. Please create an admin first.");
  }
  console.log(`👤 Assigned author: ${author.email} (ID: ${author.id})`);

  // Scan years
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Base directory not found: ${baseDir}`);
  }

  const years = fs.readdirSync(baseDir).filter(y => {
    return fs.statSync(path.join(baseDir, y)).isDirectory() && /^\d{4}$/.test(y);
  });

  console.log(`📁 Found years: ${years.join(", ")}`);

  const achievementsToCreate = [];

  for (const year of years) {
    const yearPath = path.join(baseDir, year);
    const months = fs.readdirSync(yearPath).filter(m => {
      return fs.statSync(path.join(yearPath, m)).isDirectory() && /^\d{1,2}$/.test(m);
    });

    for (const monthStr of months) {
      const month = parseInt(monthStr, 10);
      const monthPath = path.join(yearPath, monthStr);
      const files = fs.readdirSync(monthPath).filter(file => {
        const full = path.join(monthPath, file);
        return fs.statSync(full).isFile();
      });

      if (files.length === 0) {
        console.log(`⚠️ Month ${year}/${month} is empty. Skipping.`);
        continue;
      }

      // Sort files numerically based on slide index
      files.sort((a, b) => {
        return getSlideNumber(a) - getSlideNumber(b);
      });

      console.log(`📦 Month ${year}/${monthStr}: found ${files.length} files. Sorting order:`);
      files.forEach((f, i) => {
        console.log(`  Slide ${i + 1} (${getSlideNumber(f)}): ${f}`);
      });

      // Prepare target destination directory
      const destDir = path.join(destBaseDir, year, monthStr);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const galleryAr = [];

      for (const file of files) {
        const srcFile = path.join(monthPath, file);
        const destFile = path.join(destDir, file);

        // Copy file
        fs.copyFileSync(srcFile, destFile);

        // Web accessible URL
        const url = `/uploads/abraz-al-aamal/${year}/${monthStr}/${file}`;
        const type = getMediaType(file);
        galleryAr.push({ url, type });
      }

      const titleAr = `أبرز أعمال وزارة الثقافة - ${monthNamesAr[month - 1]} ${year}`;
      const titleEn = `Highlights of the Ministry of Culture - ${monthNamesEn[month - 1]} ${year}`;
      const slug = `highlights-${year}-${monthStr}`;

      // Date set to the 15th of the month
      const publishedAt = new Date(Date.UTC(parseInt(year, 10), month - 1, 15, 12, 0, 0));

      achievementsToCreate.push({
        titleAr,
        titleEn,
        slug,
        status: "PUBLISHED",
        type: "ACHIEVEMENT",
        publishedAt,
        gallery: JSON.stringify({ ar: galleryAr, en: [] }),
        authorId: author.id,
        contentAr: `<p>${titleAr}</p>`,
        contentEn: `<p>${titleEn}</p>`,
      });
    }
  }

  // Create achievements in database
  let count = 0;
  for (const ach of achievementsToCreate) {
    await prisma.post.create({ data: ach });
    console.log(`➕ Created achievement: ${ach.titleAr}`);
    count++;
  }

  console.log(`\n🎉 Success! Imported ${count} monthly achievements.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
