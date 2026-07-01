/**
 * import-moc.mjs
 *
 * يستورد ملف moc-content.json إلى قاعدة البيانات عبر Prisma
 *
 * تشغيل:
 *   node scripts/import-moc.mjs
 *   node scripts/import-moc.mjs path/to/moc-content.json
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

const filePath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve("moc-content.json");

function generateSlug(titleAr, titleEn) {
  const suffix = "-" + Date.now().toString(36);
  if (titleEn?.trim()) {
    return titleEn.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")
      .replace(/-+/g, "-").replace(/^-|-$/g, "") + suffix;
  }
  return titleAr.trim().replace(/\s+/g, "-")
    .replace(/[^؀-ۿݐ-ݿ\w-]/g, "")
    .replace(/-+/g, "-").replace(/^-|-$/g, "") + suffix;
}

async function main() {
  console.log(`📂 Reading: ${filePath}`);

  let articles;
  try {
    articles = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error("❌ Could not read file:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(articles) || articles.length === 0) {
    console.error("❌ File is empty or not a valid array");
    process.exit(1);
  }

  console.log(`📰 Found ${articles.length} articles to import\n`);

  // Find or create a default admin user to assign as author
  let author = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
  });

  if (!author) {
    console.log("⚠️  No admin user found. Creating default author...");
    const bcrypt = await import("bcryptjs");
    author = await prisma.user.create({
      data: {
        email: "import@moc.gov.sy",
        password: await bcrypt.default.hash("change-me-123", 10),
        nameAr: "استيراد تلقائي",
        nameEn: "Auto Import",
        role: "ADMIN",
      },
    });
    console.log(`✅ Created author: ${author.email}`);
  } else {
    console.log(`✅ Using author: ${author.email}`);
  }

  let imported = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const article of articles) {
    if (!article.titleAr?.trim()) {
      skipped++;
      continue;
    }

    const slug = generateSlug(article.titleAr, article.titleEn);

    try {
      await prisma.post.create({
        data: {
          titleAr:      article.titleAr,
          titleEn:      article.titleEn   || null,
          summaryAr:    article.summaryAr || null,
          summaryEn:    article.summaryEn || null,
          contentAr:    article.contentAr || null,
          contentEn:    article.contentEn || null,
          featuredImage: article.featuredImage || null,
          gallery:      Array.isArray(article.gallery) && article.gallery.length ? JSON.stringify(article.gallery) : null,
          slug,
          type:         article.type         || "NEWS",
          status:       article.status       || "PUBLISHED",
          publishedAt:  article.publishedAt  ? new Date(article.publishedAt) : new Date(),
          sourceUrl:    article.sourceUrl    || null,
          facebookUrl:  article.facebookUrl  || null,
          instagramUrl: article.instagramUrl || null,
          twitterUrl:   article.twitterUrl   || null,
          youtubeUrl:   article.youtubeUrl   || null,
          authorId:     author.id,
        },
      });
      imported++;
      process.stdout.write(`\r  ✅ Imported: ${imported}  ⏭  Skipped: ${skipped}  ❌ Errors: ${errors}`);
    } catch (e) {
      if (e.code === "P2002") {
        // slug conflict — retry with fresh slug
        try {
          await prisma.post.create({
            data: {
              titleAr:      article.titleAr,
              titleEn:      article.titleEn   || null,
              summaryAr:    article.summaryAr || null,
              summaryEn:    article.summaryEn || null,
              contentAr:    article.contentAr || null,
              contentEn:    article.contentEn || null,
              featuredImage: article.featuredImage || null,
              slug:         generateSlug(article.titleAr, article.titleEn),
              type:         article.type   || "NEWS",
              status:       article.status || "PUBLISHED",
              publishedAt:  article.publishedAt ? new Date(article.publishedAt) : new Date(),
              authorId:     author.id,
            },
          });
          imported++;
        } catch {
          errors++;
        }
      } else {
        errors++;
        console.error(`\n❌ Error on "${article.titleAr?.slice(0, 40)}":`, e.message);
      }
    }
  }

  console.log(`\n\n${"═".repeat(50)}`);
  console.log(`✅ Import complete!`);
  console.log(`   Imported : ${imported}`);
  console.log(`   Skipped  : ${skipped}`);
  console.log(`   Errors   : ${errors}`);
  console.log("═".repeat(50));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
