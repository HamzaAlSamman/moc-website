/**
 * Seed script for Event Kinds (أنواع الفعاليات)
 * Run: node prisma/seed-event-kinds.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EVENT_KINDS = [
  { nameAr: "مؤتمر", nameEn: "Conference", color: "#6C4A8F" },
  { nameAr: "معرض", nameEn: "Exhibition", color: "#15808D" },
];

async function main() {
  console.log("Seeding event kinds...");
  let created = 0;
  let skipped = 0;

  for (const kind of EVENT_KINDS) {
    try {
      await prisma.eventKind.upsert({
        where: { nameAr: kind.nameAr },
        create: kind,
        update: {},
      });
      created++;
    } catch (err) {
      console.warn(`Skipped: ${kind.nameAr} — ${err.message}`);
      skipped++;
    }
  }

  console.log(`Done! Created/verified: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
