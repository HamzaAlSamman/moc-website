/**
 * Seed script for Cultural Centers
 * Run: node prisma/seed-centers.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CENTERS = [
  // ── دمشق ──
  { governorate: "دمشق", nameAr: "مقر مديرية الثقافة بدمشق" },
  { governorate: "دمشق", nameAr: "المركز الثقافي العربي بدمشق (أبورمانة)" },
  { governorate: "دمشق", nameAr: "معهد ثقافة شعبية في الصالحية" },
  { governorate: "دمشق", nameAr: "المركز الثقافي العربي في المزة" },
  { governorate: "دمشق", nameAr: "المركز الثقافي العربي في العدوي" },
  { governorate: "دمشق", nameAr: "المركز الثقافي العربي في كفرسوسة" },
  { governorate: "دمشق", nameAr: "المركز الثقافي العربي في الميدان" },
  { governorate: "دمشق", nameAr: "المركز الثقافي العربي في برزة" },
  { governorate: "دمشق", nameAr: "مركز أحمد وليد عزت للفنون التطبيقية" },
  { governorate: "دمشق", nameAr: "معهد صلحي الوادي للموسيقى" },

  // ── ريف دمشق ──
  { governorate: "ريف دمشق", nameAr: "قصر الثقافة في دير عطية" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في جرمانا" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في صحنايا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في الكسوة" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في قطنا" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في القطيفة" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في جديدة عرطوز" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في اشرفية صحنايا" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في قارة" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في قدسيا" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في حفير الفوقا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في ضاحية الشام" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في الهامة" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في عدرا العمالية" },
  { governorate: "ريف دمشق", nameAr: "قصر الثقافة في دوما" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في الهيجانة" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في الصبورة" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في ضاحية قدسيا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في معضمية القلمون" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في التل" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في النبك" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في التواني" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في جديدة الخاص" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في حلا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في الغزلانية" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي في بلودان" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في يبرود" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في جيرود" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في زاكية" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في عربين" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في معربا" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في ضاحية الشام" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية بدير عطية" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في القطيفة" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في قطنا" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في ببيلا" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في جرمانا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في الحرجلة" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في الكسوة" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في بدا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في رنكوس" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في صيدنايا" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في قدسيا" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في جيرود" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في حينة" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في صحنايا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في تلفيتا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في جديدة الوادي" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في ضاحية المطار" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في كفر حور" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في معلولا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في عرنة" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في دوما" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في النبك" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في بلودان" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في قارة" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في يبرود" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في الزبداني" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في الرحيبة" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في الرحيبة" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في الضمير" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في جديدة عرطوز" },
  { governorate: "ريف دمشق", nameAr: "المحطة الثقافية في دير علي" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في الجراجير" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في الديماس" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في السبينة" },
  { governorate: "ريف دمشق", nameAr: "معهد الثقافة الشعبية في الصبورة" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في بيت تيما" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في حلبون" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في سرغايا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في عدرا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في عين حور" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في معرة صيدنايا" },
  { governorate: "ريف دمشق", nameAr: "المركز الثقافي العربي في داريا" },
  { governorate: "ريف دمشق", nameAr: "النافذة الثقافية في منين" },

  // ── إدلب ──
  { governorate: "إدلب", nameAr: "مديرية ثقافة إدلب" },

  // ── مراكز التسليم الخاصة بمعاملات حقوق المؤلف ──
  // دمشق وريف دمشق تصبّان معاً في الوزارة مباشرة؛ كل محافظة أخرى تحصل على
  // مركز واحد واضح، حتى لا تبقى أي محافظة بلا خيار عند إرسال معاملة إليها.
  { governorate: "دمشق", nameAr: "وزارة الثقافة في دمشق" },
  { governorate: "ريف دمشق", nameAr: "وزارة الثقافة في دمشق" },
  { governorate: "حلب", nameAr: "المركز الثقافي في حلب" },
  { governorate: "حمص", nameAr: "المركز الثقافي في حمص" },
  { governorate: "حماة", nameAr: "المركز الثقافي في حماة" },
  { governorate: "اللاذقية", nameAr: "المركز الثقافي في اللاذقية" },
  { governorate: "طرطوس", nameAr: "المركز الثقافي في طرطوس" },
  { governorate: "السويداء", nameAr: "المركز الثقافي في السويداء" },
  { governorate: "درعا", nameAr: "المركز الثقافي في درعا" },
  { governorate: "القنيطرة", nameAr: "المركز الثقافي في القنيطرة" },
  { governorate: "دير الزور", nameAr: "المركز الثقافي في دير الزور" },
  { governorate: "الرقة", nameAr: "المركز الثقافي في الرقة" },
  { governorate: "الحسكة", nameAr: "المركز الثقافي في الحسكة" },
  { governorate: "إدلب", nameAr: "المركز الثقافي في إدلب" },
];

async function main() {
  console.log("Seeding cultural centers...");
  let created = 0;
  let skipped = 0;

  for (const center of CENTERS) {
    try {
      await prisma.culturalCenter.upsert({
        where: {
          nameAr_governorate: {
            nameAr: center.nameAr,
            governorate: center.governorate,
          },
        },
        create: center,
        update: {},
      });
      created++;
    } catch (err) {
      console.warn(`Skipped: ${center.nameAr} — ${err.message}`);
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
