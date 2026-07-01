import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* ────────────────────────────────────────────────────────────────────────
 * Bulk-import "أبرز أعمال وزارة الثقافة - كانون الثاني / يناير 2026"
 * Source: ابرز الاعمال/2026/1/افضل الاعمال - كتابة.txt
 *
 * Each entry becomes a Post with type = ACHIEVEMENT (status = PUBLISHED),
 * grouped under a Category derived from the original "الشريحة" (slide)
 * sections, so it shows up on /[locale]/achievements grouped by month.
 *
 * Safe to re-run: matches existing rows by slug and updates them instead
 * of creating duplicates.
 * ──────────────────────────────────────────────────────────────────────── */

// Categories derived from the slide section headers in the source file.
// Names matching the TAG_IMAGE map in achievements/page.js ("تعاون دولي",
// "تراث", "فنون", "موسيقى", "شباب", "نشر") get a themed default image.
const CATEGORY_DEFS = [
  { slug: "international-cooperation", nameAr: "تعاون دولي",        nameEn: "International Cooperation" },
  { slug: "institutional-partnerships", nameAr: "شراكات مؤسسية",    nameEn: "Institutional Partnerships" },
  { slug: "heritage-jan2026",           nameAr: "تراث",             nameEn: "Heritage" },
  { slug: "community-culture",          nameAr: "ثقافة مجتمعية",    nameEn: "Culture in Service of Community" },
  { slug: "field-visits",               nameAr: "جولات ميدانية",    nameEn: "Field Visits" },
  { slug: "publishing-jan2026",         nameAr: "نشر",              nameEn: "Publishing" },
  { slug: "performing-arts",            nameAr: "فنون",             nameEn: "Performing Arts" },
  { slug: "music-jan2026",              nameAr: "موسيقى",           nameEn: "Music" },
  { slug: "youth-jan2026",              nameAr: "شباب",             nameEn: "Youth & Children" },
];

// One row per achievement. `link` → primary URL (auto-detected FB/IG),
// `link2` → optional secondary URL stored in `sourceUrl`.
const ITEMS = [
  // الشريحة 2 — التعاون الثقافي الدولي
  { cat: "international-cooperation", titleAr: "تعزيز العلاقات الثقافية مع الأردن خلال لقاء وزير الثقافة بالسفير الأردني", link: "https://www.facebook.com/share/p/1KCyYUzKM8/" },
  { cat: "international-cooperation", titleAr: "توسيع الشراكات مع منظمة الألكسو", link: "https://fb.watch/E_VNTYxRDr/" },
  { cat: "international-cooperation", titleAr: 'بحث آفاق التعاون مع منظمة "تركواز ماونتن" الدولية لإحياء التراث والحرف التقليدية', link: "https://www.facebook.com/share/p/16vhbPQNBZ/" },
  { cat: "international-cooperation", titleAr: "استقبال وفد البنك الدولي وبحث دور الثقافة في الاستقرار المجتمعي والتنمية", link: "https://www.facebook.com/share/p/18Gez4f5Dy/" },

  // الشريحة 3 — الشراكات المؤسسية وبناء القدرات
  { cat: "institutional-partnerships", titleAr: "مذكرة تفاهم استراتيجية مع جامعة دمشق", link: "https://www.facebook.com/share/p/1CtvTkWZYL/" },
  { cat: "institutional-partnerships", titleAr: "ورشة عمل دولية حول واقع الأرشيف السوري وتحدياته", link: "https://www.facebook.com/share/p/1G3sm1rw91/" },
  { cat: "institutional-partnerships", titleAr: 'افتتاح مشروع "بيت التراث السوري" في قلعة دمشق', link: "https://www.facebook.com/share/v/186HDvLUVM/" },
  { cat: "institutional-partnerships", titleAr: "ترميم البرج الثامن بالتعاون مع الاتحاد الأوروبي ومنظمة COSV الإيطالية", link: "https://www.facebook.com/share/p/1bAZSAzHc8/" },
  { cat: "institutional-partnerships", titleAr: "مشاركة المديرية العامة للآثار والمتاحف في ورشة إقليمية لترميم المعالم الأثرية", link: "https://www.facebook.com/share/16wSiiQ36x/" },

  // الشريحة 4 — تعزيز التراث الثقافي المادي واللامادي
  { cat: "heritage-jan2026", titleAr: "استقبال العالِم والمخترع د. عدنان وحود (76 براءة اختراع)", link: "https://www.facebook.com/share/p/1DsbvdPEuK/" },
  { cat: "heritage-jan2026", titleAr: 'إطلاق مشروع "موسوعة الجامع الأموي الكبير بدمشق"', link: "https://www.facebook.com/share/p/1aG3fJ3SGn/" },
  { cat: "heritage-jan2026", titleAr: "وزارة الثقافة توقّع اتفاقية تعاون مع ملتقى رواق للتراث السوري", link: "https://www.facebook.com/SyrSMOC/posts/pfbid0efNDKZrRAgZf5Y5dhYhSR9iDrmfHTVqatTWvSMHG7UzECu6pTHeeiLPCcayDsaSFl" },

  // الشريحة 5 — الثقافة في خدمة المجتمع
  { cat: "community-culture", titleAr: "زيارة وزارة الثقافة لأهلنا في مخيمات الشمال بمشاركة الحافلة الثقافية", link: "https://www.facebook.com/share/p/1DS6XDeaqY/" },
  { cat: "community-culture", titleAr: 'متابعة حملة "وفاء الشام لأهلنا في الخيام" وتفقد مواقع جمع التبرعات', link: "https://www.facebook.com/share/p/1C9VXKo4DF/" },

  // الشريحة 6 — الجولات الميدانية وتعزيز وحدة النسيج الوطني
  { cat: "field-visits", titleAr: "زيارة حي الشيخ مقصود في مدينة حلب والتأكيد على التعافي والعيش المشترك", link: "https://www.facebook.com/share/v/1AW6TzHz61/" },
  { cat: "field-visits", titleAr: "لقاء أكاديميين ومثقفين سوريين كُرد وتعزيز حضور الثقافة الكردية السورية", link: "https://www.facebook.com/share/v/1C8RvsHxt4/" },
  { cat: "field-visits", titleAr: "جولة في محافظتي الرقة ودير الزور والتأكيد على مكانتهما التاريخية ودورهما في المشهد الوطني", link: "https://www.facebook.com/share/v/1AFZA1i4U2/", link2: "https://www.facebook.com/share/v/17qdFAyjWH/" },
  { cat: "field-visits", titleAr: "زيارة الجسر المعلّق في دير الزور", link: "https://www.facebook.com/share/v/1AiTPC5jPW/" },
  { cat: "field-visits", titleAr: "زيارة قلعة جعبر في الرقة وإدراجها ضمن برامج وزارة الثقافة لإعادة تفعيلها كمعلم ثقافي وتاريخي", link: "https://www.facebook.com/share/r/1CE87uNZrG/" },
  { cat: "field-visits", titleAr: "لقاء وجهاء العشائر وتفعيل المراكز والفعاليات الثقافية", link: "https://www.facebook.com/share/p/17q35t9u9U/" },

  // الشريحة 7 — معرض دمشق الدولي للكتاب
  { cat: "publishing-jan2026", titleAr: "معرض دمشق الدولي للكتاب الأول بعد التحرير: التحضيرات لعودة الحدث الثقافي الأبرز", link: "https://www.facebook.com/share/p/181brCDPx6/" },

  // الشريحة 8 — الفنون الأدائية والموسيقية
  { cat: "music-jan2026", titleAr: 'أمسية "كنوز من الشرق" – فرقة الموسيقا الشرقية', link: "https://www.facebook.com/share/v/1JYk5rv2ey/" },
  { cat: "music-jan2026", titleAr: "أوركسترا ميتزو للشباب", link: "https://www.instagram.com/p/DT2HAS1DE6L" },
  { cat: "music-jan2026", titleAr: 'أمسية "إسبانيا الساحرة"', link: "https://www.instagram.com/p/DTz2OT5DCXg" },
  { cat: "performing-arts", titleAr: 'عرض مسرحي حركي "حوار – Dialogue"', link: "https://www.instagram.com/p/DTGUqISiDFg" },
  { cat: "performing-arts", titleAr: 'ورشة "تنويط الأداء الحركي – نظام لابان"', link: "https://www.instagram.com/reel/DTKkOHhiC4N" },

  // الشريحة 9 — تنمية ثقافة الطفل والشباب
  { cat: "youth-jan2026", titleAr: 'مهرجان "الربيع – التاجر الصغير" بالتعاون مع وزارة الرياضة والشباب', link: "https://www.facebook.com/share/v/1AXUJjkUzT/" },
  { cat: "youth-jan2026", titleAr: 'فعالية "التقاء الياسمين بالزيتون" – ثقافة الطفل', link: "https://www.facebook.com/share/v/16m8r5HLVL/" },
  { cat: "youth-jan2026", titleAr: "أنشطة الحافلة الثقافية الميدانية للأطفال", link: "https://www.facebook.com/share/r/1AYsX8N2kL/" },
];

function classifyLink(url) {
  if (!url) return {};
  if (/instagram\.com/i.test(url)) return { instagramUrl: url };
  if (/facebook\.com|fb\.watch/i.test(url)) return { facebookUrl: url };
  return { sourceUrl: url };
}

// Deterministic, ASCII-safe slug: "jan-2026-highlight-01", "...-02", ...
function buildSlug(index) {
  return `jan-2026-highlight-${String(index + 1).padStart(2, "0")}`;
}

// Spread items across January 2026, one per day starting Jan 2nd.
function buildPublishedAt(index) {
  const day = 2 + index; // 2..31 — fits exactly 30 items in January
  return new Date(Date.UTC(2026, 0, Math.min(day, 31), 9, 0, 0));
}

async function main() {
  console.log("🌱 Importing January 2026 highlights (أبرز أعمال كانون الثاني)...");

  let author = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!author) {
    throw new Error("لا يوجد مستخدم admin/super_admin بقاعدة البيانات لتعيينه ككاتب. أنشئ حساب أدمن أولاً.");
  }
  console.log(`✅ المؤلف: ${author.email} (${author.id})`);

  const categories = {};
  for (const def of CATEGORY_DEFS) {
    let cat = await prisma.category.findUnique({ where: { slug: def.slug } });
    if (!cat) {
      cat = await prisma.category.create({ data: def });
      console.log(`✅ أُنشئ تصنيف جديد: ${def.nameAr}`);
    }
    categories[def.slug] = cat;
  }

  let created = 0;
  let updated = 0;

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const category = categories[item.cat];
    if (!category) throw new Error(`تصنيف غير معروف: ${item.cat}`);

    const slug = buildSlug(i);
    const publishedAt = buildPublishedAt(i);

    const linkFields = { ...classifyLink(item.link) };
    if (item.link2) {
      const second = classifyLink(item.link2);
      // Don't overwrite the primary link's field; route the secondary
      // link to whichever slot is still free (sourceUrl as last resort).
      for (const [key, val] of Object.entries(second)) {
        if (!linkFields[key]) { linkFields[key] = val; break; }
        linkFields.sourceUrl = val;
      }
    }

    const data = {
      titleAr: item.titleAr,
      slug,
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      authorId: author.id,
      categoryId: category.id,
      publishedAt,
      contentAr: `<p>${item.titleAr}</p>`,
      ...linkFields,
    };

    const existing = await prisma.post.findUnique({ where: { slug } });
    if (existing) {
      await prisma.post.update({ where: { slug }, data });
      console.log(`🔄 تحديث: ${item.titleAr}`);
      updated++;
    } else {
      await prisma.post.create({ data });
      console.log(`➕ إضافة: ${item.titleAr}`);
      created++;
    }
  }

  console.log(`\n🎉 تم! أُنشئ ${created} وحُدّث ${updated} من أصل ${ITEMS.length} عنصراً.`);
}

main()
  .catch((e) => {
    console.error("❌ خطأ أثناء الاستيراد:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
