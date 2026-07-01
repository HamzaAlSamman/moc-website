const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("Admin@123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@moc.gov.sy" },
    update: {},
    create: {
      email: "admin@moc.gov.sy",
      password: hashedPassword,
      nameAr: "مدير النظام",
      nameEn: "System Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Super Admin created:", admin.email);

  // Copyright-protection workflow accounts — one login per department/stage.
  // Temporary shared password; each holder should change it on first login.
  const staffPassword = await bcrypt.hash("Moc@123456", 12);
  const workflowUsers = [
    { email: "studies.assessor@moc.gov.sy", nameAr: "الدارس المختص",          nameEn: "Studies Assessor", role: "STUDIES_ASSESSOR" },
    { email: "studies.head@moc.gov.sy",     nameAr: "رئيس قسم الدراسات",       nameEn: "Head of Studies",  role: "STUDIES_HEAD" },
    { email: "legal.director@moc.gov.sy",   nameAr: "مدير الشؤون القانونية",   nameEn: "Legal Director",   role: "LEGAL_DIRECTOR" },
    { email: "deputy.minister@moc.gov.sy",  nameAr: "معاون الوزير",            nameEn: "Deputy Minister",  role: "DEPUTY_MINISTER" },
    { email: "finance@moc.gov.sy",          nameAr: "قسم المالية",             nameEn: "Finance",          role: "FINANCE" },
  ];

  for (const u of workflowUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { ...u, password: staffPassword, isActive: true },
    });
  }

  console.log(`✅ ${workflowUsers.length} copyright-workflow accounts created (password: Moc@123456)`);

  // Cultural-calendar contributor (DIRECTORATE role). Creates events that the
  // festivals & events directorate (EVENT_MANAGER) reviews before publishing.
  // update keeps role/isActive in sync without clobbering a changed password.
  await prisma.user.upsert({
    where: { email: "tech@moc.gov.sy" },
    update: { role: "DIRECTORATE", isActive: true },
    create: {
      email: "tech@moc.gov.sy",
      password: staffPassword,
      nameAr: "مديرية التقانة والتحول الرقمي",
      nameEn: "Directorate of Technology and Digital Transformation",
      role: "DIRECTORATE",
      isActive: true,
    },
  });

  console.log("✅ Directorate account created: tech@moc.gov.sy (password: Moc@123456)");

  // Default categories
  const categories = [
    { nameAr: "أخبار الوزارة", nameEn: "Ministry News", slug: "ministry-news" },
    { nameAr: "التراث والآثار", nameEn: "Heritage & Antiquities", slug: "heritage-antiquities" },
    { nameAr: "الفنون والثقافة", nameEn: "Arts & Culture", slug: "arts-culture" },
    { nameAr: "الفعاليات والمهرجانات", nameEn: "Events & Festivals", slug: "events-festivals" },
    { nameAr: "الإعلانات الرسمية", nameEn: "Official Announcements", slug: "official-announcements" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("✅ Default categories created");

  // Default settings
  const settings = [
    { key: "site_name_ar", value: "وزارة الثقافة السورية", group: "general" },
    { key: "site_name_en", value: "Syrian Ministry of Culture", group: "general" },
    { key: "contact_email", value: "info@moc.gov.sy", group: "contact" },
    { key: "contact_phone", value: "+963 11 333 4567", group: "contact" },
    { key: "address_ar", value: "دمشق، سوريا - الروضة - شارع البرلمان", group: "contact" },
    { key: "posts_per_page", value: "10", group: "display" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log("✅ Default settings initialized");
  console.log("\n🎉 Database seeded successfully!");
  console.log("📧 Login: admin@moc.gov.sy");
  console.log("🔑 Password: Admin@123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
