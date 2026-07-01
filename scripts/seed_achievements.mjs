import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding mock achievements for Syrian Ministry of Culture...");

  // Find an admin user to assign as author
  let author = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
  });

  if (!author) {
    console.log("⚠️ No admin user found in database. Creating default author...");
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash("Admin@123456", 12);
    author = await prisma.user.create({
      data: {
        email: "admin@moc.gov.sy",
        password: hashedPassword,
        nameAr: "مدير النظام",
        nameEn: "System Admin",
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    console.log(`✅ Created default author: ${author.email}`);
  } else {
    console.log(`✅ Using existing author: ${author.email} (ID: ${author.id})`);
  }

  // Categories lookup / creation
  const categoriesData = [
    { nameAr: "التراث والآثار", nameEn: "Heritage & Antiquities", slug: "heritage-antiquities" },
    { nameAr: "الفنون والثقافة", nameEn: "Arts & Culture", slug: "arts-culture" },
    { nameAr: "الفعاليات والمهرجانات", nameEn: "Events & Festivals", slug: "events-festivals" },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    let existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      existing = await prisma.category.create({ data: cat });
      console.log(`✅ Created category: ${cat.nameAr}`);
    } else {
      categories[cat.slug] = existing;
    }
    categories[cat.slug] = existing;
  }

  // List of mock achievements
  const achievements = [
    {
      titleAr: "إنجاز أعمال ترميم وتأهيل قلعة الحصن الأثرية",
      titleEn: "Completion of restoration and rehabilitation of Crac des Chevaliers",
      summaryAr: "أنهت المديرية العامة للآثار والمتاحف بالتعاون مع البعثة الدولية المشتركة أعمال ترميم وتدعيم الأجزاء المتضررة من قلعة الحصن الأثرية بحمص وإعادتها لاستقبال الزوار والمهتمين بالآثار.",
      summaryEn: "The General Directorate of Antiquities and Museums, in cooperation with the joint international mission, completed the restoration of damaged parts of the historic Crac des Chevaliers in Homs, reopening it to visitors.",
      slug: "completion-restoration-rehabilitation-crac-des-chevaliers-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/cultural-principle6.jpg",
      authorId: author.id,
      categoryId: categories["heritage-antiquities"].id,
      publishedAt: new Date("2026-05-15T08:00:00Z"),
      contentAr: "<p>أنجزت الكوادر الفنية والأثرية في المديرية العامة للآثار والمتاحف، بالتعاون مع جهات دولية شريكة، مشروع ترميم وتأهيل أجزاء واسعة من قلعة الحصن الأثرية المدرجة على لائحة التراث العالمي.</p><p>شمل المشروع تدعيم الأبراج وتأهيل الممرات الداخلية وحماية النقوش التاريخية من التآكل وعوامل الطقس، لتكون جاهزة لاستقبال السياح والأنشطة الثقافية المختلفة.</p>",
      contentEn: "<p>Technical and archaeological crews at the General Directorate of Antiquities and Museums, in cooperation with international partners, have completed the restoration and rehabilitation project of parts of the Crac des Chevaliers, a UNESCO World Heritage site.</p>"
    },
    {
      titleAr: "افتتاح معرض الربيع السنوي للفنون التشكيلية بدمشق",
      titleEn: "Opening of the Annual Spring Fine Arts Exhibition in Damascus",
      summaryAr: "افتتحت وزارة الثقافة معرض الربيع السنوي في خان أسعد باشا بدمشق، بمشاركة واسعة من الفنانين الرواد والشباب لعرض أحدث أعمالهم الفنية الإبداعية.",
      summaryEn: "The Ministry of Culture opened the annual Spring Exhibition at Khan Asad Basha in Damascus, with wide participation of leading and young artists showcasing their latest artwork.",
      slug: "opening-annual-spring-fine-arts-exhibition-damascus-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/cultural-principle5.jpg",
      authorId: author.id,
      categoryId: categories["arts-culture"].id,
      publishedAt: new Date("2026-05-22T10:00:00Z"),
      contentAr: "<p>شهد خان أسعد باشا الأثري بدمشق القديمة افتتاح فعاليات معرض الربيع السنوي للفنون التشكيلية.</p><p>المعرض يضم أكثر من 150 لوحة ومنحوتة فنية تعبر عن مختلف المدارس التشكيلية والتي أنتجتها أنامل فنانين سوريين رواد وجيل واعد من الفنانين الشباب.</p>",
      contentEn: "<p>The historic Khan Asad Basha in Old Damascus hosted the opening of the annual Spring Fine Arts Exhibition, featuring over 150 paintings and sculptures representing various artistic movements in Syria.</p>"
    },
    {
      titleAr: "أرشفة وتوثيق 50 عنصراً جديداً من التراث السوري اللامادي",
      titleEn: "Archiving and documenting 50 new elements of Syrian intangible heritage",
      summaryAr: "نجحت مديرية التراث الثقافي اللامادي في توثيق 50 عنصراً من الحرف التقليدية والمأكولات الشعبية والأهازيج التراثية لحمايتها من الاندثار.",
      summaryEn: "The Directorate of Intangible Cultural Heritage successfully documented 50 elements of traditional crafts, folk food, and heritage chants to protect them from extinction.",
      slug: "documenting-50-elements-syrian-intangible-heritage-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/cultural-principle1.jpg",
      authorId: author.id,
      categoryId: categories["heritage-antiquities"].id,
      publishedAt: new Date("2026-05-28T09:00:00Z"),
      contentAr: "<p>ضمن الخطة الوطنية لحماية وصون التراث الثقافي السوري اللامادي، أعلنت مديرية التراث عن الانتهاء من توثيق وأرشفة 50 عنصراً جديداً تشمل أهازيج شعبية، وحرفاً يدوية تراثية، ومأكولات تقليدية مرتبطة بالهوية السورية.</p>",
      contentEn: "<p>As part of the national plan to protect and preserve Syrian intangible cultural heritage, the Directorate of Heritage announced the completion of documenting 50 new elements including folk songs, traditional handicrafts, and foods related to Syrian identity.</p>"
    },
    {
      titleAr: "إطلاق العرض المسرحي الوطني 'ذاكرة الطين' على مسرح الحمراء",
      titleEn: "Launch of the national theatrical play 'Memory of Clay' at Al-Hamra Theatre",
      summaryAr: "قدمت مديرية المسارح والموسيقى العرض المسرحي 'ذاكرة الطين' الذي يعكس الهوية التاريخية والحضارية لسوريا بأسلوب فني معاصر ومميز.",
      summaryEn: "The Directorate of Theatres and Music presented the theatrical play 'Memory of Clay', reflecting Syria's historical and cultural identity in a unique contemporary artistic style.",
      slug: "launch-national-theatrical-play-memory-of-clay-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/cultural-principle3.jpg",
      authorId: author.id,
      categoryId: categories["arts-culture"].id,
      publishedAt: new Date("2026-06-01T11:00:00Z"),
      contentAr: "<p>وسط إقبال جماهيري كبير، احتضن مسرح الحمراء بدمشق افتتاح العرض المسرحي 'ذاكرة الطين'.</p><p>العمل من تأليف وإخراج نخبة من المسرحيين السوريين، ويسلط الضوء على صمود الإنسان السوري وارتباطه بالأرض والحضارة عبر التاريخ.</p>",
      contentEn: "<p>Amid high public attendance, Al-Hamra Theatre in Damascus hosted the opening of the theatrical play 'Memory of Clay', highlighting Syrian resilience and connection to the land and civilization throughout history.</p>"
    },
    {
      titleAr: "افتتاح فعاليات المهرجان الوطني للموسيقى العربية بدار الأوبرا",
      titleEn: "Opening of the National Festival of Arabic Music at the Opera House",
      summaryAr: "انطلقت في الهيئة العامة لدار الأسد للثقافة والفنون فعاليات المهرجان الوطني للموسيقى بمشاركة أوركسترات وطنية وفرق موسيقية تراثية سورية.",
      summaryEn: "The National Music Festival kicked off at Dar al-Assad for Culture and Arts with the participation of national orchestras and traditional Syrian music bands.",
      slug: "opening-national-festival-arabic-music-opera-house-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/cultural-principle4.jpg",
      authorId: author.id,
      categoryId: categories["arts-culture"].id,
      publishedAt: new Date("2026-06-03T18:00:00Z"),
      contentAr: "<p>افتتحت وزارة الثقافة فعاليات المهرجان الوطني للموسيقى العربية في دار الأسد للثقافة والفنون (الأوبرا)، حيث يمتد المهرجان على مدار أسبوع ويشمل حفلات موسيقية وتكريمات لرموز الأغنية والموسيقى السورية.</p>",
      contentEn: "<p>The Ministry of Culture inaugurated the National Arabic Music Festival at Dar al-Assad for Culture and Arts (Opera House). The festival runs for a week and includes heritage concerts and tribute ceremonies.</p>"
    },
    {
      titleAr: "مهرجان بصرى الشام الدولي يعود إلى الواجهة الثقافية",
      titleEn: "Bosra Sham International Festival returns to the cultural forefront",
      summaryAr: "أحيى مهرجان بصرى الشام فعالياته الفنية والغنائية على المدرج الأثري الشهير، بحضور جماهيري حاشد وتغطية إعلامية واسعة.",
      summaryEn: "The Bosra Sham Festival revived its artistic and musical events on the famous archaeological amphitheater, with a massive audience turnout and extensive media coverage.",
      slug: "bosra-sham-international-festival-returns-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/cultural-principle7.jpg",
      authorId: author.id,
      categoryId: categories["events-festivals"].id,
      publishedAt: new Date("2026-06-02T20:00:00Z"),
      contentAr: "<p>على مدرج بصرى الشام الأثري، انطلقت فعاليات مهرجان بصرى الشام الدولي وسط عروض فلكلورية وموسيقية تعبر عن أصالة التراث السوري، وتأكيداً على عودة الفعاليات الثقافية الدولية إلى هذا المعلم الأثري المهم.</p>",
      contentEn: "<p>On the historic Bosra Sham Amphitheater, the Bosra Sham International Festival launched with folklore and musical performances representing the authenticity of Syrian heritage.</p>"
    },
    {
      titleAr: "اختتام فعاليات ملتقى النحت الدولي الأول بمشاركة عربية وأجنبية",
      titleEn: "Conclusion of the First International Sculpture Symposium with Arab and foreign participation",
      summaryAr: "اختتم ملتقى النحت الدولي أعماله بإنتاج 12 منحوتة رخامية عملاقة سيتم توزيعها في الساحات والحدائق العامة بمدينة دمشق.",
      summaryEn: "The International Sculpture Symposium concluded its work producing 12 massive marble sculptures to be distributed in public squares and gardens in Damascus.",
      slug: "conclusion-first-international-sculpture-symposium-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/cultural-principle2.jpg",
      authorId: author.id,
      categoryId: categories["arts-culture"].id,
      publishedAt: new Date("2026-04-18T14:00:00Z"),
      contentAr: "<p>أعلنت وزارة الثقافة عن اختتام فعاليات ملتقى النحت الدولي الأول الذي استمر لعشرين يوماً، بمشاركة نخبة من النحاتين السوريين والعرب والأجانب، حيث تم إنجاز أعمال فنية رائعة على الرخام السوري ستزين الحدائق العامة بدمشق.</p>",
      contentEn: "<p>The Ministry of Culture announced the conclusion of the First International Sculpture Symposium which lasted 20 days, featuring prominent local and international sculptors creating works to decorate public spaces in Damascus.</p>"
    },
    {
      titleAr: "إنهاء مشروع تأهيل وترميم المكتبة الظاهرية التاريخية بدمشق القديمة",
      titleEn: "Finishing the rehabilitation and restoration project of the historic Al-Zahiriyah Library in Old Damascus",
      summaryAr: "بالتعاون مع الهيئات المعنية، تم إنجاز مشروع تأهيل المكتبة الظاهرية الأثرية للحفاظ على مخطوطاتها النادرة وتوفير بيئة ملائمة للباحثين.",
      summaryEn: "In cooperation with relevant bodies, the project to rehabilitate the historic Al-Zahiriyah Library was completed to preserve its rare manuscripts and provide a suitable environment for researchers.",
      slug: "finishing-rehabilitation-restoration-historic-zahiriyah-library-2026",
      status: "PUBLISHED",
      type: "ACHIEVEMENT",
      featuredImage: "/images/drive-photos/Khan-Asad-Basha.jpg",
      authorId: author.id,
      categoryId: categories["heritage-antiquities"].id,
      publishedAt: new Date("2026-04-25T10:00:00Z"),
      contentAr: "<p>بعد عمل متواصل، أنهت الجهات الفنية مشروع ترميم المكتبة الظاهرية التاريخية بدمشق القديمة، والذي شمل إعادة تأهيل قاعات المطالعة وتطبيق معايير حديثة لحفظ المخطوطات والكتب النادرة التي تعود لقرون مضت.</p>",
      contentEn: "<p>Following continuous work, technical teams completed the restoration project of the historic Al-Zahiriyah Library in Old Damascus, preserving rare ancient manuscripts and renovating reading rooms.</p>"
    }
  ];

  let seededCount = 0;
  for (const ach of achievements) {
    const existing = await prisma.post.findUnique({ where: { slug: ach.slug } });
    if (existing) {
      await prisma.post.update({
        where: { slug: ach.slug },
        data: ach,
      });
      console.log(`🔄 Updated achievement: ${ach.titleAr}`);
    } else {
      await prisma.post.create({
        data: ach,
      });
      console.log(`➕ Created achievement: ${ach.titleAr}`);
    }
    seededCount++;
  }

  console.log(`\n🎉 Seeded ${seededCount} mock achievements successfully!`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding achievements:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
