import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🧪 Starting integration tests for Syrian Ministry of Culture website...\n");

  const results = [];
  let testNews = null;
  let testAchievement = null;
  let testEvent = null;
  let testSubmissionId = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Check Author
    // -------------------------------------------------------------------------
    const author = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    });
    if (!author) {
      throw new Error("No admin user found in database. Run db:seed or seed-achievements first.");
    }
    console.log(`✅ Step 1: Found author in database: ${author.email}`);
    results.push({ name: "Database connection & Author lookup", passed: true });

    // -------------------------------------------------------------------------
    // 2. Create Category for testing
    // -------------------------------------------------------------------------
    let category = await prisma.category.findUnique({
      where: { slug: "arts-culture" }
    });
    if (!category) {
      category = await prisma.category.create({
        data: {
          nameAr: "الفنون والثقافة",
          nameEn: "Arts & Culture",
          slug: "arts-culture"
        }
      });
    }
    console.log(`✅ Step 2: Test category resolved: ${category.nameEn}`);
    results.push({ name: "Category lookup/creation", passed: true });

    // -------------------------------------------------------------------------
    // 3. Create Test News Post
    // -------------------------------------------------------------------------
    const newsSlug = `test-integration-news-${Date.now()}`;
    testNews = await prisma.post.create({
      data: {
        titleAr: "خبر تجريبي للاختبار",
        titleEn: "Integration Test News",
        summaryAr: "ملخص خبر تجريبي",
        summaryEn: "Summary of integration test news",
        contentAr: "<p>محتوى تجريبي</p>",
        contentEn: "<p>Test content</p>",
        slug: newsSlug,
        status: "PUBLISHED",
        type: "NEWS",
        authorId: author.id,
        categoryId: category.id,
        publishedAt: new Date(),
      }
    });
    console.log(`✅ Step 3: Created test news post in database: ${testNews.slug}`);
    results.push({ name: "Create News Post via Prisma", passed: true });

    // -------------------------------------------------------------------------
    // 4. Create Test Achievement Post
    // -------------------------------------------------------------------------
    const achSlug = `test-integration-achievement-${Date.now()}`;
    testAchievement = await prisma.post.create({
      data: {
        titleAr: "إنجاز تجريبي للاختبار",
        titleEn: "Integration Test Achievement",
        summaryAr: "ملخص إنجاز تجريبي",
        summaryEn: "Summary of integration test achievement",
        contentAr: "<p>محتوى إنجاز تجريبي</p>",
        contentEn: "<p>Test achievement content</p>",
        slug: achSlug,
        status: "PUBLISHED",
        type: "ACHIEVEMENT",
        authorId: author.id,
        categoryId: category.id,
        publishedAt: new Date(),
      }
    });
    console.log(`✅ Step 4: Created test achievement post in database: ${testAchievement.slug}`);
    results.push({ name: "Create Achievement Post via Prisma", passed: true });

    // -------------------------------------------------------------------------
    // 5. Create Test Event
    // -------------------------------------------------------------------------
    testEvent = await prisma.event.create({
      data: {
        titleAr: "فعالية تجريبية للاختبار",
        titleEn: "Integration Test Event",
        descriptionAr: "وصف فعالية تجريبية",
        descriptionEn: "Description of integration test event",
        location: "دمشق، دار الأوبرا",
        locationEn: "Damascus, Opera House",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // + 1 day
        status: "UPCOMING"
      }
    });
    console.log(`✅ Step 5: Created test event in database ID: ${testEvent.id}`);
    results.push({ name: "Create Event via Prisma", passed: true });

    // -------------------------------------------------------------------------
    // 6. Test HTTP GET /api/posts?type=NEWS
    // -------------------------------------------------------------------------
    console.log(`📡 Sending GET request to ${BASE_URL}/api/posts?type=NEWS ...`);
    const newsRes = await fetch(`${BASE_URL}/api/posts?type=NEWS`);
    if (!newsRes.ok) {
      throw new Error(`GET /api/posts?type=NEWS failed with status ${newsRes.status}`);
    }
    const newsList = await newsRes.json();
    const newsFound = newsList.some(p => p.slug === newsSlug);
    if (!newsFound) {
      throw new Error(`Test news post with slug ${newsSlug} was not returned by the API`);
    }
    console.log("✅ Step 6: Verified news post shows up in public GET API response");
    results.push({ name: "GET /api/posts?type=NEWS API validation", passed: true });

    // -------------------------------------------------------------------------
    // 7. Test HTTP GET /api/posts?type=ACHIEVEMENT
    // -------------------------------------------------------------------------
    console.log(`📡 Sending GET request to ${BASE_URL}/api/posts?type=ACHIEVEMENT ...`);
    const achRes = await fetch(`${BASE_URL}/api/posts?type=ACHIEVEMENT`);
    if (!achRes.ok) {
      throw new Error(`GET /api/posts?type=ACHIEVEMENT failed with status ${achRes.status}`);
    }
    const achList = await achRes.json();
    const achFound = achList.some(p => p.slug === achSlug);
    if (!achFound) {
      throw new Error(`Test achievement with slug ${achSlug} was not returned by the API`);
    }
    console.log("✅ Step 7: Verified achievement shows up in public GET API response");
    results.push({ name: "GET /api/posts?type=ACHIEVEMENT API validation", passed: true });

    // -------------------------------------------------------------------------
    // 8. Test HTTP GET /api/events
    // -------------------------------------------------------------------------
    console.log(`📡 Sending GET request to ${BASE_URL}/api/events ...`);
    const evRes = await fetch(`${BASE_URL}/api/events`);
    if (!evRes.ok) {
      throw new Error(`GET /api/events failed with status ${evRes.status}`);
    }
    const evList = await evRes.json();
    const evFound = evList.some(e => e.id === testEvent.id);
    if (!evFound) {
      throw new Error(`Test event with ID ${testEvent.id} was not returned by the API`);
    }
    console.log("✅ Step 8: Verified event shows up in public GET API response");
    results.push({ name: "GET /api/events API validation", passed: true });

    // -------------------------------------------------------------------------
    // 9. Test HTTP POST /api/event-submissions (Public Submission Form API)
    // -------------------------------------------------------------------------
    console.log(`📡 Sending POST request to ${BASE_URL}/api/event-submissions ...`);
    const submissionPayload = {
      applicantName: "مختبر الفحص التلقائي",
      directorate: "مديرية التقنية",
      phone: "0912345678",
      email: "test-bot@moc.gov.sy",
      eventName: "أمسية اختبار برمجية متطورة",
      entityType: "INDIVIDUAL",
      description: "فعالية لغرض اختبار جودة الخدمة واستقرار الأنظمة",
      goals: ["cultural", "education"],
      agreedToTerms: true
    };
    const subRes = await fetch(`${BASE_URL}/api/event-submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionPayload)
    });
    if (!subRes.ok) {
      throw new Error(`POST /api/event-submissions failed with status ${subRes.status}`);
    }
    const subResult = await subRes.json();
    if (!subResult.success || !subResult.id) {
      throw new Error("Invalid response format from event submissions API");
    }
    testSubmissionId = subResult.id;
    console.log(`✅ Step 9: Event submission created successfully via API, ID: ${testSubmissionId}`);
    results.push({ name: "POST /api/event-submissions API validation", passed: true });

    // Verify submission is in the database
    const dbSub = await prisma.eventSubmission.findUnique({
      where: { id: testSubmissionId }
    });
    if (!dbSub) {
      throw new Error(`Submission ID ${testSubmissionId} was reported created, but not found in DB`);
    }
    console.log("✅ Step 10: Verified submission exists in database");
    results.push({ name: "Database verification for event submission", passed: true });

  } catch (err) {
    console.error("\n❌ TEST ERROR:", err.message);
    results.push({ name: "Test execution", passed: false, error: err.message });
  } finally {
    // -------------------------------------------------------------------------
    // Clean Up
    // -------------------------------------------------------------------------
    console.log("\n🧹 Cleaning up test records from database...");

    if (testNews) {
      await prisma.post.delete({ where: { id: testNews.id } }).catch(() => {});
      console.log(`- Deleted test news: ${testNews.slug}`);
    }
    if (testAchievement) {
      await prisma.post.delete({ where: { id: testAchievement.id } }).catch(() => {});
      console.log(`- Deleted test achievement: ${testAchievement.slug}`);
    }
    if (testEvent) {
      await prisma.event.delete({ where: { id: testEvent.id } }).catch(() => {});
      console.log(`- Deleted test event: ${testEvent.id}`);
    }
    if (testSubmissionId) {
      await prisma.eventSubmission.delete({ where: { id: testSubmissionId } }).catch(() => {});
      console.log(`- Deleted test submission: ${testSubmissionId}`);
    }

    await prisma.$disconnect();
    console.log("🧹 Cleanup completed.");
  }

  // -------------------------------------------------------------------------
  // Print Summary Table
  // -------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("                  INTEGRATION TESTS SUMMARY            ");
  console.log("=======================================================");
  let failed = false;
  results.forEach(r => {
    if (r.passed) {
      console.log(`[PASS]  ${r.name}`);
    } else {
      console.log(`[FAIL]  ${r.name} - Reason: ${r.error}`);
      failed = true;
    }
  });
  console.log("=======================================================");
  if (failed) {
    console.log("❌ Result: SOME TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("🎉 Result: ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

runTests();
