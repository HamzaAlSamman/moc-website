/**
 * seed-mock.js
 * Seeding the database with realistic Syrian Ministry of Culture mock data.
 * Run: node prisma/seed-mock.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Citizen ID pepper from env, default if not specified
const CITIZEN_ID_PEPPER = process.env.CITIZEN_ID_PEPPER || "citizen-id-pepper-CHANGE-THIS-IN-PRODUCTION-32chars";
const BOOKING_TICKET_SECRET = process.env.BOOKING_TICKET_SECRET || "REDACTED_DEV_ONLY_PLACEHOLDER";

function hashNationalId(nationalId) {
  return crypto.createHmac("sha256", CITIZEN_ID_PEPPER).update(nationalId, "utf8").digest("hex");
}

function hashLegalLicenseAccessToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function createBookingTicketSignature(booking) {
  const message = `${booking.referenceNo}\0${booking.eventId}\0${booking.nationalIdHash}`;
  return crypto.createHmac("sha256", BOOKING_TICKET_SECRET).update(message).digest("hex");
}

// Generate base64 url-safe access token (similar to crypto.randomBytes(32).toString("base64url"))
function generateAccessToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function main() {
  console.log("🧹 Cleaning up old database tables...");
  
  // Clean tables in correct dependency order
  await prisma.eventBooking.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.eventCategory.deleteMany({});
  await prisma.eventKind.deleteMany({});
  await prisma.culturalCenter.deleteMany({});
  await prisma.eventSubmission.deleteMany({});
  await prisma.legalLicenseReviewItem.deleteMany({});
  await prisma.legalLicenseAttachment.deleteMany({});
  await prisma.legalLicenseFounder.deleteMany({});
  await prisma.legalLicenseHistory.deleteMany({});
  await prisma.legalLicenseApplication.deleteMany({});
  await prisma.copyrightSubmission.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.postTag.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.citizenEmailOtp.deleteMany({});
  await prisma.citizenToken.deleteMany({});
  await prisma.citizen.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.referenceCounter.deleteMany({});
  await prisma.setting.deleteMany({});

  console.log("🌱 Database clean! Seeding users...");

  // 1. Seed Users (CMS Staff)
  const superAdminPassword = await bcrypt.hash("Admin@123456", 12);
  const staffPassword = await bcrypt.hash("Moc@123456", 12);

  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@moc.gov.sy",
      password: superAdminPassword,
      nameAr: "مدير النظام",
      nameEn: "System Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const staffUsers = [
    { email: "studies.assessor@moc.gov.sy", nameAr: "الدارس المختص", nameEn: "Studies Assessor", role: "STUDIES_ASSESSOR" },
    { email: "studies.head@moc.gov.sy", nameAr: "رئيس قسم الدراسات", nameEn: "Head of Studies", role: "STUDIES_HEAD" },
    { email: "legal.director@moc.gov.sy", nameAr: "مدير الشؤون القانونية", nameEn: "Legal Director", role: "LEGAL_DIRECTOR" },
    { email: "deputy.minister@moc.gov.sy", nameAr: "معاون الوزير", nameEn: "Deputy Minister", role: "DEPUTY_MINISTER" },
    { email: "finance@moc.gov.sy", nameAr: "قسم المالية", nameEn: "Finance Specialist", role: "FINANCE" },
    { email: "tech@moc.gov.sy", nameAr: "مديرية التقانة والتحول الرقمي", nameEn: "Directorate of Technology", role: "DIRECTORATE" },
    { email: "events.manager@moc.gov.sy", nameAr: "مدير الفعاليات والمهرجانات", nameEn: "Events & Festivals Director", role: "EVENT_MANAGER" },
    { email: "media.office@moc.gov.sy", nameAr: "المكتب الإعلامي", nameEn: "Media Office Specialist", role: "MEDIA_OFFICE" },
    { email: "editor@moc.gov.sy", nameAr: "محرر محتوى", nameEn: "Content Editor", role: "EDITOR" },
    { email: "ticket.officer1@moc.gov.sy", nameAr: "موظف فحص التذاكر 1", nameEn: "Ticket Gate Officer 1", role: "EVENT_MANAGER" },
    { email: "ticket.officer2@moc.gov.sy", nameAr: "موظف فحص التذاكر 2", nameEn: "Ticket Gate Officer 2", role: "EVENT_MANAGER" }
  ];

  // Keyed by email so events below can be attributed to a real user id.
  const staffUserIds = {};
  for (const u of staffUsers) {
    const created = await prisma.user.create({
      data: {
        ...u,
        password: staffPassword,
        isActive: true,
      },
    });
    staffUserIds[u.email] = created.id;
  }
  console.log(`✅ Seeded ${staffUsers.length + 1} CMS users.`);

  // 2. Seed Settings
  const settings = [
    { key: "site_name_ar", value: "وزارة الثقافة السورية", group: "general" },
    { key: "site_name_en", value: "Syrian Ministry of Culture", group: "general" },
    { key: "contact_email", value: "info@moc.gov.sy", group: "contact" },
    { key: "contact_phone", value: "+963 11 333 4567", group: "contact" },
    { key: "address_ar", value: "دمشق، سوريا - الروضة - شارع البرلمان", group: "contact" },
    { key: "posts_per_page", value: "10", group: "display" },
  ];

  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }
  console.log("✅ Seeded default settings.");

  // 3. Seed Post Categories
  const categories = [
    { nameAr: "أخبار الوزارة", nameEn: "Ministry News", slug: "ministry-news" },
    { nameAr: "التراث والآثار", nameEn: "Heritage & Antiquities", slug: "heritage-antiquities" },
    { nameAr: "الفنون والثقافة", nameEn: "Arts & Culture", slug: "arts-culture" },
    { nameAr: "الفعاليات والمهرجانات", nameEn: "Events & Festivals", slug: "events-festivals" },
    { nameAr: "الإعلانات الرسمية", nameEn: "Official Announcements", slug: "official-announcements" },
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const created = await prisma.category.create({ data: cat });
    categoryMap[cat.slug] = created.id;
  }
  console.log("✅ Seeded post categories.");

  // 4. Seed Posts (News, Announcements, Achievements, Pages)
  const posts = [
    {
      titleAr: "نائب وزير الثقافة يستقبل أعضاء مجلس إدارة اتحاد الناشرين السوريين الجديد",
      titleEn: "Deputy Minister of Culture Receives the New Board of Syrian Publishers Association",
      summaryAr: "استقبل نائب وزير الثقافة الأستاذ سعد نعسان، أعضاء مجلس إدارة اتحاد الناشرين السوريين الجديد برئاسة الدكتور عاطف نموس، لبحث سبل تعزيز التعاون في دعم صناعة النشر والكتاب وتطوير الإنتاج الثقافي.",
      summaryEn: "The Deputy Minister of Culture received members of the new board of directors of the Syrian Publishers Association to discuss cooperation in supporting the publishing industry.",
      contentAr: "<p>استقبل نائب وزير الثقافة الأستاذ سعد نعسان، أعضاء مجلس إدارة اتحاد الناشرين السوريين الجديد برئاسة الدكتور عاطف نموس، لبحث سبل تعزيز التعاون في دعم صناعة النشر والكتاب وتطوير الإنتاج الثقافي، وتعزيز حضور الكتاب السوري محلياً ودولياً.</p>",
      slug: "deputy-minister-receives-publishers-association",
      type: "NEWS",
      status: "PUBLISHED",
      categoryId: categoryMap["ministry-news"],
      publishedAt: new Date(Date.now() - 3600000 * 24 * 5), // 5 days ago
    },
    {
      titleAr: "وزير الثقافة يفتتح الجناح الوطني السوري ضمن دورة بينالي البندقية الفني الدولي",
      titleEn: "Minister of Culture Opens the Syrian National Pavilion at the Venice Biennale",
      summaryAr: "افتتح وزير الثقافة الجناح الوطني للجمهورية العربية السورية ضمن الدورة الحادية والستين لبينالي البندقية في إيطاليا، بحضور ممثلي البعثات الدبلوماسية ونخبة من الفنانين الدوليين.",
      summaryEn: "The Minister of Culture inaugurated the national pavilion of the Syrian Arab Republic at the 61st Venice Biennale in Italy.",
      contentAr: "<p>شهد الجناح تقديم المشروع الفني \"مدفن تدمر البرجي\" للفنانة السورية سارة شمة، المستلهم من الإرث الحضاري لمدينة تدمر، عبر رؤية بصرية معاصرة توظّف الرسم والعمارة والضوء والصوت ضمن تجربة فنية تفاعلية.</p>",
      slug: "minister-opens-syrian-pavilion-venice-biennale",
      type: "NEWS",
      status: "PUBLISHED",
      categoryId: categoryMap["arts-culture"],
      publishedAt: new Date(Date.now() - 3600000 * 24 * 3), // 3 days ago
    },
    {
      titleAr: "وزارة الثقافة تنظم فعالية \"صور من التراث\" على مسرح دار أوبرا دمشق",
      titleEn: "Ministry of Culture Organizes \"Heritage Images\" Event at Damascus Opera House",
      summaryAr: "نظّمت وزارة الثقافة فعالية \"صور من التراث\" على مسرح دار أوبرا دمشق، بمشاركة عدد من الفرق الفنية السورية التي قدّمت لوحات مستوحاة من الموروث الشعبي السوري بمختلف أنواعه.",
      summaryEn: "The Ministry of Culture organized \"Images of Heritage\" event at the Opera House, featuring Syrian folklore groups.",
      contentAr: "<p>وشهدت الفعالية مشاركة كل من الفرقة الفنية الشركسية، وفرقة آشتي للتراث الكردي، وفرقة بارميا للتراث السرياني الآشوري، وفرقة كارني للتراث الأرمني، وفرقة آمال للمسرح الراقص.</p>",
      slug: "heritage-images-event-damascus-opera-house",
      type: "NEWS",
      status: "PUBLISHED",
      categoryId: categoryMap["heritage-antiquities"],
      publishedAt: new Date(Date.now() - 3600000 * 24 * 12), // 12 days ago
    },
    {
      titleAr: "أبرز أعمال وزارة الثقافة خلال شهر تموز 2026",
      titleEn: "Highlights of the Ministry of Culture Achievements in July 2026",
      summaryAr: "نستعرض في هذا الملف التفاعلي أبرز الإنجازات والأنشطة الثقافية التي قامت بها مديريات وهيئات وزارة الثقافة السورية خلال شهر تموز من العام الجاري.",
      summaryEn: "A comprehensive summary of the main cultural activities and achievements accomplished by the Ministry of Culture in July 2026.",
      contentAr: "<p>استمرار الفعاليات الفنية والموسيقية وتأهيل المراكز الأثرية والبدء بتقديم الخدمات الرقمية للمواطنين.</p>",
      slug: "highlights-of-achievements-july-2026",
      type: "ACHIEVEMENT",
      status: "PUBLISHED",
      categoryId: categoryMap["events-festivals"],
      publishedAt: new Date(Date.now() - 3600000 * 24 * 1), // 1 day ago
    },
    {
      titleAr: "أبرز أعمال وزارة الثقافة خلال شهر حزيران 2026",
      titleEn: "Highlights of the Ministry of Culture Achievements in June 2026",
      summaryAr: "أبرز ما تم إنجازه في العمل الثقافي والأثري وترميم المعالم التاريخية خلال شهر حزيران 2026.",
      summaryEn: "Highlights of cultural, arts and heritage projects carried out by the Ministry during June 2026.",
      contentAr: "<p>أبرز أعمال وزارة الثقافة خلال شهر حزيران 2026 تشمل افتتاح معارض فنية ومهرجانات مسرحية للشباب.</p>",
      slug: "highlights-of-achievements-june-2026",
      type: "ACHIEVEMENT",
      status: "PUBLISHED",
      categoryId: categoryMap["events-festivals"],
      publishedAt: new Date(Date.now() - 3600000 * 24 * 32), // 32 days ago
    },
    {
      titleAr: "بدء التقديم على المنح الإنتاجية السنوية للأعمال الأدبية والموسيقية للشباب",
      titleEn: "Applications Open for Annual Production Grants for Youth Lit & Music",
      summaryAr: "تعلن وزارة الثقافة عن فتح باب التقدم لنيل المنح الإنتاجية السنوية لدعم ورعاية الأعمال الأدبية والفنية والموسيقية الشابة لعام 2026.",
      summaryEn: "The Syrian Ministry of Culture announces the start of applications for youth production grants for literary and musical works.",
      contentAr: "<p>تستهدف المنح الكتاب والأدباء والموسيقيين الشباب دون سن الخامسة والثلاثين. يستمر التقديم لغاية نهاية شهر أيلول القادم.</p>",
      slug: "applications-open-annual-youth-grants-2026",
      type: "ANNOUNCEMENT",
      status: "PUBLISHED",
      categoryId: categoryMap["official-announcements"],
      publishedAt: new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
    },
    {
      titleAr: "بيان هام بخصوص حماية وتوثيق الأعيان والمواقع الأثرية الوطنية",
      titleEn: "Important Announcement Regarding Protection of National Archaeological Sites",
      summaryAr: "تؤكد المديرية العامة للآثار والمتاحف ضرورة تعاون الفعاليات الأهلية لتوثيق وحماية المواقع الأثرية والإبلاغ عن أي انتهاكات.",
      summaryEn: "The Directorate General of Antiquities & Museums stresses community collaboration in preserving national heritage sites.",
      contentAr: "<p>تدعو الوزارة جميع المهتمين والمواطنين للمحافظة على المواقع الأثرية كونها إرثاً إنسانياً وتاريخياً يمثل الهوية السورية العريقة.</p>",
      slug: "announcement-protection-national-heritage-sites",
      type: "ANNOUNCEMENT",
      status: "PUBLISHED",
      categoryId: categoryMap["official-announcements"],
      publishedAt: new Date(Date.now() - 3600000 * 24 * 7), // 7 days ago
    },
    {
      titleAr: "رؤية وأهداف وزارة الثقافة العربية السورية",
      titleEn: "Vision and Objectives of the Syrian Ministry of Culture",
      contentAr: "<p>تسعى وزارة الثقافة إلى نشر وتعميق الوعي الثقافي والفكري، ورعاية الإبداع الأدبي والفني، وصون التراث الحضاري والأثري السوري العريق، وربط الثقافة بالمجتمع كأداة للتنمية المستدامة والتقدم الإنساني.</p>",
      slug: "about-ministry-vision-objectives",
      type: "PAGE",
      status: "PUBLISHED",
      publishedAt: new Date(),
    }
  ];

  for (const post of posts) {
    await prisma.post.create({
      data: {
        ...post,
        authorId: superAdmin.id,
      },
    });
  }
  console.log("✅ Seeded posts & announcements.");

  // 5. Seed Event Categories & Event Kinds
  const eventCategories = [
    { nameAr: "مهرجان ثقافي", nameEn: "Cultural Festival", color: "#708090" },
    { nameAr: "ندوات ومحاضرات فكرية", nameEn: "Seminars & Lectures", color: "#32CD32" },
    { nameAr: "حفل غنائي وموسيقي", nameEn: "Concert & Music", color: "#E74C3C" },
    { nameAr: "معرض فنون تشكيلية", nameEn: "Fine Arts Exhibition", color: "#C0392B" },
    { nameAr: "عرض مسرحي", nameEn: "Theatre Play", color: "#1C665A" },
    { nameAr: "ورشات تفاعلية للأطفال", nameEn: "Children Interactive Workshops", color: "#FF69B4" },
  ];

  const eventCategoryMap = {};
  for (const ec of eventCategories) {
    const created = await prisma.eventCategory.create({ data: ec });
    eventCategoryMap[ec.nameAr] = created.id;
  }

  const eventKinds = [
    { nameAr: "مؤتمر", nameEn: "Conference", color: "#6C4A8F" },
    { nameAr: "معرض", nameEn: "Exhibition", color: "#15808D" },
    { nameAr: "مهرجان", nameEn: "Festival", color: "#E67E22" },
    { nameAr: "حفل", nameEn: "Concert", color: "#9B59B6" },
    { nameAr: "مسرحية", nameEn: "Play", color: "#27AE60" },
    { nameAr: "ندوة", nameEn: "Seminar", color: "#2980B9" },
  ];

  const eventKindMap = {};
  for (const ek of eventKinds) {
    const created = await prisma.eventKind.create({ data: ek });
    eventKindMap[ek.nameAr] = created.id;
  }
  console.log("✅ Seeded event categories and event kinds.");

  // 6. Seed Cultural Centers
  const centers = [
    { nameAr: "المركز الثقافي العربي في أبو رمانة", governorate: "دمشق" },
    { nameAr: "المركز الثقافي العربي في المزة", governorate: "دمشق" },
    { nameAr: "المركز الثقافي العربي في كفرسوسة", governorate: "دمشق" },
    { nameAr: "قصر الثقافة في دوما", governorate: "ريف دمشق" },
    { nameAr: "المحطة الثقافية في جرمانا", governorate: "ريف دمشق" },
    { nameAr: "المركز الثقافي العربي في حلب", governorate: "حلب" },
    { nameAr: "المركز الثقافي العربي في حمص", governorate: "حمص" },
    { nameAr: "المركز الثقافي العربي في حماة", governorate: "حماة" },
    { nameAr: "المركز الثقافي العربي في اللاذقية", governorate: "اللاذقية" },
    { nameAr: "المركز الثقافي العربي في طرطوس", governorate: "طرطوس" },
  ];

  const centerList = [];
  for (const center of centers) {
    const created = await prisma.culturalCenter.create({ data: center });
    centerList.push(created);
  }
  console.log(`✅ Seeded ${centerList.length} cultural centers.`);

  // 7. Seed Events (Past, Ongoing, Future)
  const today = new Date();
  
  const mockEvents = [
    // --- Ongoing ---
    {
      titleAr: "مهرجان دمشق الثقافي السنوي للتراث والفنون الشعبية",
      titleEn: "Annual Damascus Cultural Festival for Heritage & Folklore",
      descriptionAr: "يتضمن مهرجان هذا العام لوحات فلكلورية وعروضاً تراثية حية تمثل مختلف المحافظات السورية بالإضافة إلى معارض حرف يدوية تقليدية وندوات تاريخية.",
      descriptionEn: "This year's festival features folklore performances representing all Syrian governorates, traditional handicrafts exhibitions, and historical seminars.",
      location: "مكتبة الأسد الوطنية والمراكز الثقافية بدمشق",
      locationEn: "Al-Assad National Library and Damascus Cultural Centers",
      governorate: "دمشق",
      governorateEn: "Damascus",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 18, 0), // started yesterday
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 22, 0), // ends in 3 days
      featuredImage: "/images/cultural-principle1.jpg",
      status: "ONGOING",
      eventCategoryId: eventCategoryMap["مهرجان ثقافي"],
      eventKindId: eventKindMap["مهرجان"],
      bookingAvailability: "DISABLED",
    },
    {
      titleAr: "معرض دمشق الدولي للكتاب التخصصي ومستلزمات النشر",
      titleEn: "Damascus International Book Exhibition & Publishing Materials",
      descriptionAr: "معرض كتاب متخصص لعرض أحدث الكتب التخصصية والعلمية بمشاركة أكثر من 80 دار نشر سورية وعربية.",
      descriptionEn: "A specialized book fair showing the latest academic and scientific books, with 80+ Syrian & Arab publishers participating.",
      location: "مكتبة الأسد الوطنية - صالة المعارض الكبرى",
      locationEn: "Al-Assad National Library - Grand Exhibition Hall",
      governorate: "دمشق",
      governorateEn: "Damascus",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 10, 0), // started 2 days ago
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 21, 0), // ends in 2 days
      featuredImage: "/images/cultural-principle2.jpg",
      status: "ONGOING",
      eventCategoryId: eventCategoryMap["معرض فنون تشكيلية"], // fits in fine arts / exhibitions
      eventKindId: eventKindMap["معرض"],
      bookingAvailability: "DISABLED",
    },
    // --- Future (Open for internal booking) ---
    {
      titleAr: "حفل الفرقة الوطنية السورية للموسيقا العربية بقيادة المايسترو عدنان أيلول",
      titleEn: "Syrian National Orchestra Concert for Arabic Music conducted by Adnan Ailoul",
      descriptionAr: "أمسية موسيقية كلاسيكية تستحضر روائع التراث الغنائي السوري والموشحات الأندلسية بحناجر مطربين سوريين متميزين.",
      descriptionEn: "A classical musical evening presenting masterpieces of Syrian vocal heritage and Andalusian Muwashahat by prominent Syrian vocalists.",
      location: "مسرح دار الأوبرا بدمشق - القاعة الرئيسية",
      locationEn: "Damascus Opera House - Main Hall",
      governorate: "دمشق",
      governorateEn: "Damascus",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 20, 0), // starts in 4 days
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 22, 30),
      featuredImage: "/images/cultural-principle3.jpg",
      status: "UPCOMING",
      eventCategoryId: eventCategoryMap["حفل غنائي وموسيقي"],
      eventKindId: eventKindMap["حفل"],
      bookingAvailability: "OPEN",
      capacity: 120,
      waitlistEnabled: true,
      bookingOpensAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      bookingClosesAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
      bookingNoteAr: "يرجى الحضور قبل موعد الحفل بـ 30 دقيقة. الالتزام باللباس الرسمي إلزامي.",
      bookingNoteEn: "Please arrive 30 minutes before the concert. Formal attire is required."
    },
    {
      titleAr: "مسرحية \"تحت السقف البارد\" للمخرج السوري قيس زريقة",
      titleEn: "\"Under the Cold Roof\" - A Play directed by Syrian Qais Zraika",
      descriptionAr: "عرض مسرحي معاصر يناقش قضايا الهوية والانتماء والاغتراب الاجتماعي في قالب درامي مشوق.",
      descriptionEn: "A contemporary theatrical play addressing themes of identity, belonging, and social alienation in a suspenseful drama style.",
      location: "مسرح القباني بدمشق",
      locationEn: "Al-Qabbani Theatre, Damascus",
      governorate: "دمشق",
      governorateEn: "Damascus",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 19, 0), // starts in 7 days
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 21, 30), // runs 3 days
      featuredImage: "/images/cultural-principle4.jpg",
      status: "UPCOMING",
      eventCategoryId: eventCategoryMap["عرض مسرحي"],
      eventKindId: eventKindMap["مسرحية"],
      bookingAvailability: "OPEN",
      capacity: 80,
      waitlistEnabled: true,
      bookingOpensAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
      bookingClosesAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6),
      bookingNoteAr: "البطاقات شخصية وتخضع للمطابقة مع الهوية الشخصية عند الباب.",
      bookingNoteEn: "Tickets are personal and subject to match with the national ID at the gate."
    },
    {
      titleAr: "ندوة حوارية: مستقبل الخط العربي وتجليات الفن الرقمي",
      titleEn: "Symposium: The Future of Arabic Calligraphy and Digital Art Manifestations",
      descriptionAr: "يستضيف المركز نخبة من الخطاطين والمصممين السوريين لمناقشة الحفاظ على روح الخط العربي الأصيل وتوظيفه في الفنون الرقمية الحديثة.",
      descriptionEn: "Hosting a group of Syrian calligraphers and designers to discuss preserving Arabic calligraphy and integrating it into digital arts.",
      location: "المركز الثقافي العربي في أبو رمانة",
      locationEn: "Arab Cultural Center in Abu Rummaneh",
      governorate: "دمشق",
      governorateEn: "Damascus",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 17, 30), // in 12 days
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 19, 30),
      featuredImage: "/images/cultural-principle5.jpg",
      status: "UPCOMING",
      eventCategoryId: eventCategoryMap["ندوات ومحاضرات فكرية"],
      eventKindId: eventKindMap["ندوة"],
      bookingAvailability: "OPEN",
      capacity: 50,
      waitlistEnabled: false,
      bookingOpensAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
      bookingClosesAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11),
    },
    // --- Past ---
    {
      titleAr: "معرض الفنون التشكيلية المعاصر لفناني محافظة حمص الموهوبين",
      titleEn: "Contemporary Fine Arts Exhibition for Gifted Homs Artists",
      descriptionAr: "ضم المعرض أكثر من 60 لوحة ومنحوتة فنية تحاكي الأمل والسلام وإعادة الإعمار بمشاركة 22 فناناً تشكيلياً.",
      descriptionEn: "The exhibition included 60+ paintings and sculptures themed around hope and peace, featuring 22 fine artists.",
      location: "المركز الثقافي العربي في حمص - صالة المعارض",
      locationEn: "Arab Cultural Center in Homs - Exhibition Hall",
      governorate: "حمص",
      governorateEn: "Homs",
      startDate: new Date(today.getFullYear(), today.getMonth() - 1, 10, 10, 0), // 1 month ago
      endDate: new Date(today.getFullYear(), today.getMonth() - 1, 15, 20, 0),
      featuredImage: "/images/cultural-principle6.jpg",
      status: "COMPLETED",
      eventCategoryId: eventCategoryMap["معرض فنون تشكيلية"],
      eventKindId: eventKindMap["معرض"],
      bookingAvailability: "CLOSED",
      capacity: 100,
    },
    {
      titleAr: "أمسية شعرية وقراءات نقدية للشاعر السوري الكبير نزار قباني",
      titleEn: "Poetry Evening and Critical Readings of the Poet Nizar Qabbani",
      descriptionAr: "فعالية استعادية احتفت بإرث الشاعر الراحل نزار قباني بمشاركة أدباء ونقاد من سورية والوطن العربي وقراءات لقصائده الخالدة.",
      descriptionEn: "A memorial event celebrating Qabbani's legacy, featuring critics and writers reading his immortal poems.",
      location: "المركز الثقافي العربي في المزة",
      locationEn: "Arab Cultural Center in Mezzeh",
      governorate: "دمشق",
      governorateEn: "Damascus",
      startDate: new Date(today.getFullYear(), today.getMonth() - 1, 24, 18, 0), // last month
      endDate: new Date(today.getFullYear(), today.getMonth() - 1, 24, 20, 30),
      featuredImage: "/images/cultural-principle7.jpg",
      status: "COMPLETED",
      eventCategoryId: eventCategoryMap["ندوات ومحاضرات فكرية"],
      eventKindId: eventKindMap["ندوة"],
      bookingAvailability: "CLOSED",
      capacity: 60,
    },
    // --- Future (For other governorates) ---
    {
      titleAr: "مهرجان حلب لمسرح الطفل والدمى المتحركة",
      titleEn: "Aleppo Children's Theatre and Puppetry Festival",
      descriptionAr: "مهرجان عائلي تفاعلي يضم عروض مسرح طفل، وعروض مسرح الدمى، بالإضافة لورش عمل فنية للأطفال لتعليم صنع الدمى التقليدية.",
      descriptionEn: "Interactive family festival featuring children's theatre, puppet shows, and workshops for kids on making traditional puppets.",
      location: "المركز الثقافي العربي في حلب - مسرح الكندي",
      locationEn: "Arab Cultural Center in Aleppo - Al-Kindi Theatre",
      governorate: "حلب",
      governorateEn: "Aleppo",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15, 11, 0), // in 15 days
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 19, 16, 0),
      featuredImage: "/images/panorama.jpg",
      status: "UPCOMING",
      eventCategoryId: eventCategoryMap["ورشات تفاعلية للأطفال"],
      eventKindId: eventKindMap["مهرجان"],
      bookingAvailability: "OPEN",
      capacity: 200,
      waitlistEnabled: true,
    },
    {
      titleAr: "معرض التصوير الضوئي الميداني \"سوريا بعدسات الشباب\"",
      titleEn: "Field Photography Exhibition \"Syria through Youth Lenses\"",
      descriptionAr: "معرض يستعرض 120 صورة فوتوغرافية التقطها مصورون سوريون شباب تبرز جمال الطبيعة، التراث المعماري، وتفاصيل الحياة اليومية.",
      descriptionEn: "Exhibition showcasing 120 photographs taken by young Syrian photographers highlighting nature, architectural heritage, and daily life.",
      location: "المركز الثقافي العربي في اللاذقية - صالة المعارض",
      locationEn: "Arab Cultural Center in Latakia - Exhibition Gallery",
      governorate: "اللاذقية",
      governorateEn: "Latakia",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20, 10, 0), // in 20 days
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 25, 20, 0),
      featuredImage: "/images/aleppo.jpg",
      status: "UPCOMING",
      eventCategoryId: eventCategoryMap["معرض فنون تشكيلية"],
      eventKindId: eventKindMap["معرض"],
      bookingAvailability: "DISABLED",
    },
    // --- Pending Review Event (Created by tech@moc.gov.sy) ---
    {
      titleAr: "ملتقى الآثار والمدن المنسية في ريف إدلب الأثري",
      titleEn: "Antiquities and Dead Cities Forum in Rural Idlib",
      descriptionAr: "فعالية ثقافية تسلط الضوء على الإرث المعماري والأثري الفريد لقرى ومواقع شمال غرب سوريا المدرجة على لوائح التراث العالمي.",
      descriptionEn: "A cultural event highlighting the unique architectural and archaeological heritage of Dead Cities in northwest Syria.",
      location: "المركز الثقافي في إدلب (مؤقت)",
      locationEn: "Cultural Center in Idlib (Temporary)",
      governorate: "إدلب",
      governorateEn: "Idlib",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 28, 11, 0), // in 28 days
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 28, 15, 0),
      featuredImage: "/images/ministry.jpg",
      status: "UPCOMING",
      eventCategoryId: eventCategoryMap["ندوات ومحاضرات فكرية"],
      eventKindId: eventKindMap["ندوة"],
      reviewStatus: "PENDING",
      createdById: staffUserIds["tech@moc.gov.sy"],
      bookingAvailability: "DISABLED",
    }
  ];

  const eventList = [];
  for (const ev of mockEvents) {
    const created = await prisma.event.create({ data: ev });
    eventList.push(created);
  }
  console.log(`✅ Seeded ${eventList.length} calendar events (past, ongoing, future).`);

  // 8. Seed Citizens (Verified, Pending, Not Submitted)
  const citizenPassword = await bcrypt.hash("Citizen@123456", 12);
  const mockCitizens = [
    {
      email: "ahmad.khalil@gmail.com",
      fullName: "أحمد خليل",
      phone: "+963 933 444 555",
      nationalId: "01010101010",
      emailVerifiedAt: new Date(),
      identityStatus: "VERIFIED",
      identityVerifiedAt: new Date(),
      identityFrontFileKey: "verified-nid-front.jpg",
      identityBackFileKey: "verified-nid-back.jpg",
    },
    {
      email: "nour.alali@hotmail.com",
      fullName: "نور العلي",
      phone: "+963 944 555 666",
      nationalId: "02020202020",
      emailVerifiedAt: new Date(),
      identityStatus: "VERIFIED",
      identityVerifiedAt: new Date(),
      identityFrontFileKey: "verified-nid-front-2.jpg",
      identityBackFileKey: "verified-nid-back-2.jpg",
    },
    {
      email: "bassem.hasan@yahoo.com",
      fullName: "باسم حسن",
      phone: "+963 955 666 777",
      nationalId: "03030303030",
      emailVerifiedAt: new Date(),
      identityStatus: "VERIFIED",
      identityVerifiedAt: new Date(),
      identityFrontFileKey: "verified-nid-front-3.jpg",
      identityBackFileKey: "verified-nid-back-3.jpg",
    },
    {
      email: "rima.syria@outlook.com",
      fullName: "ريما الأحمد",
      phone: "+963 966 777 888",
      nationalId: "04040404040",
      emailVerifiedAt: new Date(),
      identityStatus: "PENDING",
      identitySubmittedAt: new Date(),
      identityFrontFileKey: "pending-nid-front-4.jpg",
      identityBackFileKey: "pending-nid-back-4.jpg",
    },
    {
      email: "khaled.masri@gmail.com",
      fullName: "خالد المصري",
      phone: "+963 988 888 999",
      nationalId: "05050505050",
      emailVerifiedAt: new Date(),
      identityStatus: "PENDING",
      identitySubmittedAt: new Date(),
      identityFrontFileKey: "pending-nid-front-5.jpg",
      identityBackFileKey: "pending-nid-back-5.jpg",
    },
    {
      email: "hala.syriac@gmail.com",
      fullName: "هالة إبراهيم",
      phone: "+963 999 111 222",
      nationalId: "06060606060",
      emailVerifiedAt: new Date(),
      identityStatus: "NOT_SUBMITTED",
    },
    {
      email: "tareq.homs@gmail.com",
      fullName: "طارق سليم",
      phone: "+963 933 111 333",
      nationalId: "07070707070",
      identityStatus: "NOT_SUBMITTED", // Email not verified either
    }
  ];

  const citizenList = [];
  for (const c of mockCitizens) {
    const { nationalId, ...rest } = c;
    const created = await prisma.citizen.create({
      data: {
        ...rest,
        password: citizenPassword,
        nationalIdHash: hashNationalId(nationalId || "99999999999"),
        nationalIdLast4: nationalId ? nationalId.slice(-4) : "9999",
      },
    });
    citizenList.push(created);
  }
  console.log(`✅ Seeded ${citizenList.length} public citizens.`);

  // 9. Seed Event Bookings (For Open Events)
  const openEvents = eventList.filter(e => e.bookingAvailability === "OPEN");
  let bookingCount = 0;
  
  if (openEvents.length >= 2) {
    const musicEvent = openEvents[0];
    const theaterEvent = openEvents[1];
    
    // Bookings for Music Event (Verified citizens)
    const verifiedCitizens = citizenList.filter(c => c.identityStatus === "VERIFIED");
    
    for (let idx = 0; idx < verifiedCitizens.length; idx++) {
      const citizen = verifiedCitizens[idx];
      const ref = `BKG-2026-${String(idx + 1).padStart(4, "0")}`;
      
      const ticketSig = createBookingTicketSignature({
        referenceNo: ref,
        eventId: musicEvent.id,
        nationalIdHash: citizen.nationalIdHash
      });

      await prisma.eventBooking.create({
        data: {
          eventId: musicEvent.id,
          citizenId: citizen.id,
          referenceNo: ref,
          fullName: citizen.fullName,
          nationalIdHash: citizen.nationalIdHash,
          nationalIdLast4: citizen.nationalIdLast4,
          email: citizen.email,
          phone: citizen.phone,
          status: "CONFIRMED",
          attendanceStatus: idx === 0 ? "ATTENDED" : "NOT_CHECKED_IN",
          ticketSig,
        }
      });
      bookingCount++;
    }
    
    // Update bookedCount on Event table
    await prisma.event.update({
      where: { id: musicEvent.id },
      data: { bookedCount: verifiedCitizens.length }
    });

    // Bookings for Theater Event
    for (let idx = 0; idx < 2; idx++) {
      const citizen = verifiedCitizens[idx];
      const ref = `BKG-2026-${String(idx + 10).padStart(4, "0")}`;
      
      const ticketSig = createBookingTicketSignature({
        referenceNo: ref,
        eventId: theaterEvent.id,
        nationalIdHash: citizen.nationalIdHash
      });

      await prisma.eventBooking.create({
        data: {
          eventId: theaterEvent.id,
          citizenId: citizen.id,
          referenceNo: ref,
          fullName: citizen.fullName,
          nationalIdHash: citizen.nationalIdHash,
          nationalIdLast4: citizen.nationalIdLast4,
          email: citizen.email,
          phone: citizen.phone,
          status: "CONFIRMED",
          attendanceStatus: "NOT_CHECKED_IN",
          ticketSig,
        }
      });
      bookingCount++;
    }

    await prisma.event.update({
      where: { id: theaterEvent.id },
      data: { bookedCount: 2 }
    });
  }
  console.log(`✅ Seeded ${bookingCount} confirmed seat bookings.`);

  // 10. Seed Event Submissions (Requests from citizens)
  const submissions = [
    {
      referenceNo: "EVT-2026-0001",
      applicantName: "مأمون الحموي",
      phone: "+963 933 111 222",
      email: "mamoun.h@gmail.com",
      eventName: "أمسية غنائية لإحياء التراث الموشحات الأندلسية والقدود الحلبية",
      entityType: "INDIVIDUAL",
      description: "طلب إقامة أمسية موسيقية تضم 8 فنانين شباب لإحياء القدود الحلبية والموشحات الأندلسية على مسرح المراكز الثقافية.",
      goals: "ربط الأجيال الشابة بالتراث الموسيقي السوري الأصيل وتقديم فرصة للمواهب الشابة للظهور.",
      governorate: "دمشق",
      culturalCenterId: centerList[0].id, // أبو رمانة
      proposedVenue: "المسرح الصغير",
      proposedDate: "2026-09-10",
      eventType: "أمسية موسيقية",
      agreedToTerms: true,
      status: "PENDING"
    },
    {
      referenceNo: "EVT-2026-0002",
      applicantName: "جمعية رعاية الطفولة بحلب",
      entityType: "EXTERNAL",
      entityName: "جمعية رعاية الطفولة بحلب",
      phone: "+963 21 222 333",
      email: "childhood.care@gmail.com",
      eventName: "مهرجان فرح الطفولة الفني والترفيهي الرابع للأيتام",
      description: "فعالية ترفيهية وتعليمية للأطفال الأيتام تشمل عروض مسرح خيال الظل، فقرات رسم، وأشغال يدوية فنية تفاعلية.",
      goals: "تقديم الرعاية النفسية والترفيهية للأطفال ودمجهم بالفعاليات الثقافية والاجتماعية.",
      governorate: "حلب",
      culturalCenterId: centerList[5].id, // حلب
      proposedVenue: "المسرح الرئيسي وصالة المعارض",
      proposedDate: "2026-10-05",
      eventType: "مهرجان طفل",
      agreedToTerms: true,
      status: "APPROVED",
      adminNotes: "تمت الموافقة من قبل مديرية ثقافة الطفل. التنسيق مع مديرية ثقافة حلب لتسهيل التجهيزات."
    },
    {
      referenceNo: "EVT-2026-0003",
      applicantName: "د. غياث الجاسم",
      phone: "+963 944 111 222",
      email: "g.jassim@hotmail.com",
      eventName: "محاضرة علمية: ترميم المباني الأثرية المتضررة بأساليب تحافظ على هويتها الأصلية",
      entityType: "INDIVIDUAL",
      description: "محاضرة علمية يلقيها أساتذة وباحثون متخصصون في الهندسة المعمارية والآثار، وتستعرض تقنيات الترميم العالمية التي تطبق على المباني الحجرية القديمة في سوريا.",
      goals: "نشر المعرفة الأكاديمية والتقنية حول صيانة التراث المعماري السوري ورفع وعي العاملين والطلاب.",
      governorate: "حمص",
      culturalCenterId: centerList[6].id, // حمص
      proposedVenue: "قاعة الندوات الرئيسية",
      proposedDate: "2026-09-22",
      eventType: "محاضرة فكرية",
      agreedToTerms: true,
      status: "UNDER_REVIEW"
    },
    {
      referenceNo: "EVT-2026-0004",
      applicantName: "رنا اليوسف",
      phone: "+963 955 111 222",
      email: "rana.y@yahoo.com",
      eventName: "معرض رسم شخصي: شظايا من نور وأمل",
      entityType: "INDIVIDUAL",
      description: "معرض فنون تشكيلية يضم 30 لوحة زيتية تعبر عن مراحل التعافي السوري والجمال الكامن في الحارات الدمشقية القديمة.",
      goals: "تقديم الفن السوري المعاصر ودعم الحراك التشكيلي النسائي وتنشيط صالات المعارض بالوزارة.",
      governorate: "دمشق",
      culturalCenterId: centerList[1].id, // المزة
      proposedVenue: "صالة الفنون التشكيلية",
      proposedDate: "2026-08-30",
      eventType: "معرض فني",
      agreedToTerms: true,
      status: "REJECTED",
      adminNotes: "الطلب مرفوض مؤقتاً بسبب عدم كفاية التفاصيل الفنية المرفقة ونماذج اللوحات. يمكن للمتقدمة التقديم بطلب جديد مستوفٍ."
    }
  ];

  for (const sub of submissions) {
    await prisma.eventSubmission.create({ data: sub });
  }
  console.log(`✅ Seeded ${submissions.length} citizen event submissions.`);

  // 11. Seed Legal License Applications (For private arts/music/cultural institutes)
  const licenses = [
    {
      referenceNo: "LIC-2026-0001",
      accessTokenHash: hashLegalLicenseAccessToken("token-lic-1"),
      applicantName: "ممدوح الشاطر",
      nationalId: "01020304050",
      phone: "+963 933 999 888",
      email: "m.shater@outlook.com",
      capacity: "120",
      licenseType: "MUSIC_INSTITUTE",
      entityName: "معهد شمس الفني للموسيقى الكلاسيكية",
      purpose: "تأسيس معهد موسيقي خاص يعنى بتدريس الآلات الموسيقية الشرقية والغربية وعلوم الموسيقى للأطفال والشباب.",
      objectives: "نشر الثقافة الموسيقية الأكاديمية وصقل المواهب السورية وتأهيل الدارسين للامتحانات الوطنية للموسيقى.",
      activityDescription: "حصص تدريسية فردية وجماعية، ورش عمل موسيقية دورية، وحفل سنوي للطلاب على مسرح المراكز الثقافية.",
      governorate: "دمشق",
      address: "دمشق - المزة فيلات شرقية - بناية رقم 12",
      status: "SUBMITTED",
      submittedAt: new Date(today.getTime() - 3600000 * 24 * 6), // 6 days ago
    },
    {
      referenceNo: "LIC-2026-0002",
      accessTokenHash: hashLegalLicenseAccessToken("token-lic-2"),
      applicantName: "فاديا القوتلي",
      nationalId: "02030405060",
      phone: "+963 944 888 777",
      email: "fadia.k@gmail.com",
      capacity: "80",
      licenseType: "FINE_ARTS_GALLERY",
      entityName: "غاليري القوتلي للفنون التشكيلية المعاصرة",
      purpose: "ترخيص صالة عرض للفنون التشكيلية والبصرية تستضيف معارض لفنانين سوريين ومغتربين وندوات نقدية متخصصة.",
      objectives: "دعم الحركة التشكيلية السورية والترويج لأعمال الفنانين السوريين الشباب وإقامة ورش فنية.",
      activityDescription: "تنظيم معارض دورية نصف شهرية، بيع الأعمال الفنية بترخيص رسمي، واستضافة لقاءات أدبية ونقدية.",
      governorate: "دمشق",
      address: "دمشق - أبو رمانة - شارع الجلاء - طابق أرضي مع حديقة",
      status: "UNDER_REVIEW",
      submittedAt: new Date(today.getTime() - 3600000 * 24 * 12), // 12 days ago
    },
    {
      referenceNo: "LIC-2026-0003",
      accessTokenHash: hashLegalLicenseAccessToken("token-lic-3"),
      applicantName: "جهاد الرفاعي",
      nationalId: "03040506070",
      phone: "+963 955 777 666",
      email: "j.rifai@gmail.com",
      capacity: "150",
      licenseType: "CULTURAL_FORUM",
      entityName: "منتدى عشتار الثقافي والفكري والأدبي",
      purpose: "تأسيس صالون ومنتدى ثقافي مرخص يعقد لقاءات أدبية، قراءات كتب، وعروض أفلام مستقلة لمناقشتها.",
      objectives: "تعزيز المناخ الحواري الفكري المعتدل ودعم القراءة والكتاب ونشر نتاجات الشباب الأدبية والمشهد النقدي.",
      activityDescription: "لقاءات أسبوعية دورية كل ثلاثاء، إشهار كتب وروايات جديدة، وعرض ومناقشة أفلام ذات بعد إنساني.",
      governorate: "حمص",
      address: "حمص - حي المحطة - شارع البرازيل - بناء الرفاعي",
      status: "APPROVED",
      submittedAt: new Date(today.getTime() - 3600000 * 24 * 30),
      issuedAt: new Date(today.getTime() - 3600000 * 24 * 5),
    },
    {
      referenceNo: "LIC-2026-0004",
      accessTokenHash: hashLegalLicenseAccessToken("token-lic-4"),
      applicantName: "نزار الحكيم",
      nationalId: "04050607080",
      phone: "+963 988 777 555",
      email: "nizar.hakim@yahoo.com",
      capacity: "60",
      licenseType: "AMATEUR_TROUPE",
      entityName: "فرقة نيزك الهواة للفنون المسرحية والإيمائية",
      purpose: "ترخيص فرقة مسرحية للهواة لتقديم عروض مسرحية تجريبية ومسرح شارع في الأماكن العامة والمراكز الثقافية.",
      objectives: "تمكين الشباب الهواة من صقل مهاراتهم المسرحية والتمثيلية وتقديم الفن كرسالة للمجتمع.",
      activityDescription: "تدريبات أداء وتدريبات حركية أسبوعية، إنتاج عرض مسرحي واحد على الأقل سنوياً، والمشاركة بالمهرجانات الوطنية.",
      governorate: "اللاذقية",
      address: "اللاذقية - حي الزراعة - مقابل الجامعة",
      status: "DRAFT",
    }
  ];

  for (const lic of licenses) {
    const app = await prisma.legalLicenseApplication.create({
      data: {
        ...lic,
        declarationAccuracy: true,
        declarationResponsibility: true,
        declarationPrivacy: true,
        applicantSignature: "data:image/png;base64,mockSignatureImageBase64StringForLegalLicenseSeedingTest"
      }
    });

    // Seed founders for submitted/under_review applications
    if (lic.status !== "DRAFT") {
      await prisma.legalLicenseFounder.create({
        data: {
          applicationId: app.id,
          fullName: lic.applicantName,
          nationalId: lic.nationalId,
          occupation: "مهندس / فنان",
          qualification: "جامعي",
          phone: lic.phone,
          email: lic.email,
          address: lic.address,
          isAuthorizedRepresentative: true,
        }
      });

      await prisma.legalLicenseFounder.create({
        data: {
          applicationId: app.id,
          fullName: "شريك مؤسس ثاني",
          nationalId: lic.nationalId.slice(0, -2) + "99",
          occupation: "موسيقي وباحث",
          qualification: "ماجستير فنون",
          phone: "+963 933 222 333",
          email: "partner@moc.gov.sy",
          address: lic.address,
          isAuthorizedRepresentative: false,
        }
      });

      // Seed history log
      await prisma.legalLicenseHistory.create({
        data: {
          applicationId: app.id,
          actorName: lic.applicantName,
          actorRole: "APPLICANT",
          fromStatus: "DRAFT",
          toStatus: "SUBMITTED",
          action: "SUBMIT",
          note: "تم تقديم الطلب إلكترونياً وإرفاق الثبوتيات المطلوبة كاملة.",
        }
      });

      if (lic.status === "UNDER_REVIEW" || lic.status === "APPROVED") {
        await prisma.legalLicenseHistory.create({
          data: {
            applicationId: app.id,
            actorEmail: "studies.assessor@moc.gov.sy",
            actorName: "الدارس المختص",
            actorRole: "STUDIES_ASSESSOR",
            fromStatus: "SUBMITTED",
            toStatus: "UNDER_REVIEW",
            action: "START_REVIEW",
            note: "البدء بدراسة الملف والتحقق من صحة المستندات والثبوتيات القانونية.",
          }
        });
      }

      if (lic.status === "APPROVED") {
        await prisma.legalLicenseHistory.create({
          data: {
            applicationId: app.id,
            actorEmail: "deputy.minister@moc.gov.sy",
            actorName: "معاون الوزير",
            actorRole: "DEPUTY_MINISTER",
            fromStatus: "UNDER_REVIEW",
            toStatus: "APPROVED",
            action: "APPROVE",
            note: "تمت الموافقة النهائية بعد استكمال كافة الشروط وتحقيق المتطلبات وتوصية اللجنة الفنية.",
          }
        });
      }

      // Seed attachments
      const docKinds = ["NATIONAL_ID_FRONT", "NATIONAL_ID_BACK", "CRIMINAL_RECORD", "ACTIVITY_PLAN", "OWNERSHIP_OR_LEASE"];
      for (const kind of docKinds) {
        await prisma.legalLicenseAttachment.create({
          data: {
            applicationId: app.id,
            kind: kind,
            originalName: `${kind.toLowerCase()}_copy.jpg`,
            mimeType: "image/jpeg",
            size: 142000,
            storageKey: `${app.id}/${kind.toLowerCase()}-${crypto.randomUUID()}.jpg`,
            verificationCode: `VER-${app.id.slice(0, 4)}-${kind.slice(0, 3)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
            generatedAt: new Date(),
          }
        });
      }

      // Seed review items for testing review list page
      await prisma.legalLicenseReviewItem.create({
        data: {
          applicationId: app.id,
          applicationRevision: 1,
          requirementKey: "req_national_id",
          scope: "APPLICANT",
          status: lic.status === "APPROVED" ? "ACCEPTED" : "PENDING",
          reviewerName: lic.status === "APPROVED" ? "الدارس المختص" : null,
          reviewedAt: lic.status === "APPROVED" ? new Date() : null,
        }
      });
      await prisma.legalLicenseReviewItem.create({
        data: {
          applicationId: app.id,
          applicationRevision: 1,
          requirementKey: "req_premises_lease",
          scope: "PREMISES",
          status: lic.status === "APPROVED" ? "ACCEPTED" : "PENDING",
          reviewerName: lic.status === "APPROVED" ? "الدارس المختص" : null,
          reviewedAt: lic.status === "APPROVED" ? new Date() : null,
        }
      });
    }
  }
  console.log(`✅ Seeded ${licenses.length} licensing applications, founders, attachments, history logs.`);

  // 12. Seed Copyright Submissions (creative work registrations)
  const copyrights = [
    {
      referenceNo: "CPR-2026-0001",
      applicantName: "خلدون العطار",
      applicantPhone: "+963 944 111 222",
      applicantEmail: "khaldoun.atar@gmail.com",
      applicantRole: "author", // author, representative, publisher
      workTitle: "رواية \"دروب الياسمين المفقودة\"",
      workCategory: "literary", // literary, dramatic, musical, artistic, software
      workDesc: "رواية أدبية تتناول البعد الإنساني والاجتماعي وتاريخ دمشق خلال العقد الأخير في قالب روائي درامي.",
      province: "دمشق",
      center: "مديرية حماية حقوق المؤلف بدمشق",
      completionDate: "2026-02-15",
      hasTelecomDoc: false,
      paymentStatus: "fully_paid",
      applicationStatus: "approved",
      paymentRef: "PAY-CASH-771661",
      workOrigin: "original",
      internalRefNumber: "REF-STUD-110",
      internalRefSetById: "studies.assessor@moc.gov.sy",
    },
    {
      referenceNo: "CPR-2026-0002",
      applicantName: "يارا حسن",
      applicantPhone: "+963 955 222 333",
      applicantEmail: "yara.h@gmail.com",
      applicantRole: "author",
      workTitle: "معزوفة موسيقية وغنائية: \"نبض حلب\"",
      workCategory: "musical",
      workDesc: "مقطوعة موسيقية شرقية معاصرة تدمج آلة القانون بالبيانو الكلاسيكي وتصاحبها قراءة شعرية تراثية.",
      province: "حلب",
      center: "مديرية ثقافة حلب",
      completionDate: "2026-04-10",
      hasTelecomDoc: false,
      paymentStatus: "fully_paid",
      applicationStatus: "under_review",
      paymentRef: "PAY-CASH-881992",
      workOrigin: "original",
    },
    {
      referenceNo: "CPR-2026-0003",
      applicantName: "شركة شام للبرمجيات والحلول الرقمية",
      applicantPhone: "+963 11 223 3444",
      applicantEmail: "info@shamsoft.sy",
      applicantRole: "representative",
      workTitle: "نظام \"شام-دوكس\" لإدارة الأرشفة والوثائق الحكومية المفتوحة",
      workCategory: "software",
      workDesc: "برمجية ويب متطورة مصممة بأحدث قواعد البيانات لإدارة دورة حياة المستندات وحفظ السجلات الرقمية بطريقة آمنة.",
      province: "دمشق",
      center: "مديرية حماية حقوق المؤلف بدمشق",
      completionDate: "2026-05-01",
      hasTelecomDoc: true,
      paymentStatus: "fully_paid",
      applicationStatus: "submitted",
      paymentRef: "PAY-CASH-991113",
      workOrigin: "original",
      commercialRegisterFile: "commercial_reg_sham.jpg",
      delegationFile: "delegation_letter.jpg",
    },
    {
      referenceNo: "CPR-2026-0004",
      applicantName: "بهاء الأيوبي",
      applicantPhone: "+963 999 555 444",
      applicantEmail: "bahaa.a@yahoo.com",
      applicantRole: "author",
      workTitle: "لوحة جدارية زيتية: \"عودة تدمر\"",
      workCategory: "artistic",
      workDesc: "لوحة تشكيلية زيتية بمقاس 3*2 متر تجسد صمود الآثار التدمرية والنهوض الحضاري لسورية من الركام.",
      province: "حمص",
      center: "مديرية ثقافة حمص",
      completionDate: "2026-06-20",
      hasTelecomDoc: false,
      paymentStatus: "pending",
      applicationStatus: "draft",
      workOrigin: "original",
    },
    {
      referenceNo: "CPR-2026-0005",
      applicantName: "سليم الوهاب",
      applicantPhone: "+963 933 777 111",
      applicantEmail: "salim.w@gmail.com",
      applicantRole: "author",
      workTitle: "مسرحية نصية كاملة: \"صراخ الصمت\"",
      workCategory: "dramatic",
      workDesc: "نص مسرحي تجريبي من فصلين يتناول أثر التحولات الاجتماعية في بناء العلاقات الإنسانية المعاصرة.",
      province: "طرطوس",
      center: "مديرية ثقافة طرطوس",
      completionDate: "2026-01-30",
      hasTelecomDoc: false,
      paymentStatus: "fully_paid",
      applicationStatus: "suspended",
      paymentRef: "PAY-CASH-102030",
      workOrigin: "original",
      deficiencyNote: "الملف المرفق للنص المسرحي غير واضح وصيغته تالفة. يرجى إعادة رفع النص بصيغة PDF واضحة ومقروءة لتتم متابعة الدراسة المالية والفنية للطلب.",
    }
  ];

  for (const cp of copyrights) {
    await prisma.copyrightSubmission.create({
      data: {
        ...cp,
        idDocType: "national_id",
        idFileFront: "doc_front.jpg",
        idFileBack: "doc_back.jpg",
        workFile: "creative_work.zip",
        applicantSignature: "data:image/png;base64,mockSignatureBase64ForCopyrightSeedingTest"
      }
    });
  }
  console.log(`✅ Seeded ${copyrights.length} copyright protection submissions (draft, submitted, suspended, review, approved).`);

  // 13. Seed In-app Notifications for Admin topbar bell
  const notifications = [
    {
      userId: superAdmin.id,
      type: "SUBMISSION_PENDING",
      titleAr: "طلب فعالية جديدة بانتظار المراجعة: أمسية غنائية لإحياء التراث",
      titleEn: "New event submission pending review: Andalusian heritage concert",
      link: "/admin/event-submissions",
      isRead: false,
    },
    {
      userId: superAdmin.id,
      type: "LICENSE_SUBMITTED",
      titleAr: "طلب ترخيص جديد مقدم: معهد شمس الفني للموسيقى",
      titleEn: "New license application submitted: Shams Music Institute",
      link: "/admin/legal-licenses",
      isRead: false,
    },
    {
      userId: superAdmin.id,
      type: "COPYRIGHT_PAYMENT_VERIFY",
      titleAr: "إشعار دفع جديد لحقوق المؤلف بانتظار التأكيد: شركة شام للبرمجيات",
      titleEn: "New copyright fee payment verification: Sham Soft",
      link: "/admin/copyright",
      isRead: false,
    },
    {
      userId: superAdmin.id,
      type: "EVENT_PENDING_APPROVAL",
      titleAr: "فعالية تم إنشاؤها وتنتظر موافقة المديرية: ملتقى الآثار في ريف إدلب",
      titleEn: "New calendar event pending approval: Antiquities Forum in Idlib",
      link: "/admin/events",
      isRead: true, // Marked as read
    }
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }
  console.log(`✅ Seeded ${notifications.length} admin notifications.`);

  console.log("\n🚀 Database seeded successfully with a rich set of mock data!");
  console.log("------------------------------------------------------------------");
  console.log("🔒 Staff Logins (Password: Moc@123456):");
  console.log("   - Assessor:      studies.assessor@moc.gov.sy (STUDIES_ASSESSOR)");
  console.log("   - Studies Head:  studies.head@moc.gov.sy (STUDIES_HEAD)");
  console.log("   - Legal Dir:     legal.director@moc.gov.sy (LEGAL_DIRECTOR)");
  console.log("   - Deputy Min:    deputy.minister@moc.gov.sy (DEPUTY_MINISTER)");
  console.log("   - Directorate:   tech@moc.gov.sy (DIRECTORATE)");
  console.log("   - Events Dir:    events.manager@moc.gov.sy (EVENT_MANAGER)");
  console.log("🔑 Super Admin Login (Password: Admin@123456): admin@moc.gov.sy");
  console.log("👤 Citizen Logins (Password: Citizen@123456):");
  console.log("   - Ahmad (Ver):   ahmad.khalil@gmail.com (NID: 01010101010)");
  console.log("   - Rima (Pend):   rima.syria@outlook.com (NID: 04040404040)");
  console.log("------------------------------------------------------------------");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
