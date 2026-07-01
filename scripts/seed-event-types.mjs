import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TYPES = [
  { nameAr: "شعر", nameEn: "Poetry", color: "#6C4A8F" },
  { nameAr: "معرض", nameEn: "Exhibition", color: "#15808D" },
  { nameAr: "مهرجان", nameEn: "Festival", color: "#1C665A" },
  { nameAr: "ندوة", nameEn: "Seminar", color: "#B25329" },
  { nameAr: "موسيقى", nameEn: "Music", color: "#2B5C8F" },
  { nameAr: "تراث", nameEn: "Heritage", color: "#b9a779" },
  { nameAr: "سينما", nameEn: "Cinema", color: "#A63A3A" },
  { nameAr: "ثقافي", nameEn: "Cultural", color: "#1C665A" },
];

async function main() {
  console.log("🧹 Clearing existing event types...");
  const deleteRes = await prisma.eventType.deleteMany({});
  console.log(`✅ Deleted ${deleteRes.count} event types.`);

  console.log("🌱 Seeding default event types...");
  const createRes = await prisma.eventType.createMany({
    data: DEFAULT_TYPES,
  });
  console.log(`✅ Successfully seeded ${createRes.count} default event types.`);
}

main()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
