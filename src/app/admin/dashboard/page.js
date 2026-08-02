import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/permissions";
import AdminShell from "@/components/admin/AdminShell";
import StatsCard from "@/components/admin/StatsCard";
import RecentPosts from "@/components/admin/RecentPosts";
import RecentEvents from "@/components/admin/RecentEvents";
import CopyrightStaffQueue from "@/components/admin/CopyrightStaffQueue";

// Copyright workflow roles each own one stage of the review pipeline. These
// helpers describe each role's stage so the dashboard can show ONLY the
// submissions currently awaiting that role's action.
const COPYRIGHT_STAGE_LABEL = {
  [ROLES.FINANCE]:          "تدقيق وتأكيد الرسوم المالية",
  [ROLES.STUDIES_ASSESSOR]: "الدراسة الفنية وإعداد التقرير",
  [ROLES.STUDIES_HEAD]:     "اعتماد توصيات قسم الدراسات",
  [ROLES.LEGAL_DIRECTOR]:   "التدقيق القانوني والإحالة للموافقة",
  [ROLES.DEPUTY_MINISTER]:  "الموافقة الإدارية النهائية",
};

// Prisma `where` selecting the submissions sitting in a given role's inbox.
function copyrightAwaitingWhere(role) {
  switch (role) {
    case ROLES.FINANCE:
      // Finance owns two stages: verifying the initial fee (finance_review)
      // and the final fee before certificate issuance (final_review).
      return { applicationStatus: { in: ["finance_review", "final_review"] } };
    case ROLES.STUDIES_ASSESSOR:
      return { applicationStatus: "under_review", assessorReportFile: null };
    case ROLES.STUDIES_HEAD:
      return { applicationStatus: "under_review", assessorReportFile: { not: null }, studiesRecommendationsFile: null };
    case ROLES.LEGAL_DIRECTOR:
      return { applicationStatus: "under_review", assessorReportFile: { not: null }, studiesRecommendationsFile: { not: null } };
    case ROLES.DEPUTY_MINISTER:
      return { applicationStatus: "pending_final_approval" };
    default:
      return null;
  }
}

// Statuses that are still "in flight" (not finished or rejected) — used for the
// secondary "total active" figure shown to copyright staff.
const COPYRIGHT_ACTIVE_STATUSES = ["finance_review", "under_review", "suspended", "pending_final_approval", "pending_fees", "final_review"];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const role = user.role;

  // Each role gets a curated dashboard with ONLY what matters for its job —
  // not a generic permission-filtered list. Grouping by job, not by raw permission:
  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  const isEditor = role === ROLES.EDITOR;
  const isWriter = role === ROLES.AUTHOR || role === ROLES.CONTRIBUTOR;
  const isEventManager = role === ROLES.EVENT_MANAGER;
  const isMediaOffice = role === ROLES.MEDIA_OFFICE;
  const isViewer = role === ROLES.VIEWER;
  // Directorate contributor — creates calendar events that go through review.
  // Its dashboard is scoped to its OWN events and their review state.
  const isDirectorate = role === ROLES.DIRECTORATE;
  // Copyright-protection workflow staff — each acts on one stage of the pipeline.
  const isCopyrightStaff = Boolean(copyrightAwaitingWhere(role));

  const needPostOverview = isAdmin || isEditor || isViewer;
  // Achievements (PostType.ACHIEVEMENT) get their own management section + their
  // own dashboard number — they shouldn't be buried inside the generic "posts" count.
  const needAchievementSplit = isAdmin || isEditor;
  const needEventOverview = isAdmin || isEditor || isEventManager || isViewer;
  const needSubmissions = isAdmin || isEditor || isEventManager;
  // Copyright is its own service (not event-related), so it gets its own
  // dashboard number scoped to the roles that actually staff it.
  const needCopyrightOverview = isAdmin || isEditor;

  // MEDIA_OFFICE manages ALL news & achievements (it holds VIEW_ANY_POST), so its
  // dashboard counts/lists must NOT be scoped to its own authorId — otherwise it
  // sees zeros for everything authored by other people. Writers stay scoped to
  // their own work.
  const postScope = isMediaOffice ? {} : { authorId: user.id };

  const [
    postsCount,
    publishedCount,
    achievementsCount,
    pendingReviewCount,
    eventsCount,
    upcomingEventsCount,
    ongoingEventsCount,
    usersCount,
    pendingSubmissionsCount,
    pendingCopyrightCount,
    myPostsCount,
    myDraftsCount,
    myPublishedCount,
    myAchievementsCount,
    myAchievementDraftsCount,
    myPublishedAchievementsCount,
    recentPosts,
    recentEvents,
    myRecentPosts,
    myRecentAchievements,
    copyrightAwaitingCount,
    copyrightActiveCount,
    copyrightAwaitingList,
    dirEventsCount,
    dirUpcomingCount,
    dirOngoingCount,
    dirCompletedCount,
    dirRecentEvents,
    eventsAwaitingReviewCount,
    eventsAwaitingReviewList,
    totalCopyrightSubmissionsCount,
    totalEventSubmissionsCount,
  ] = await Promise.all([
    needPostOverview ? prisma.post.count() : Promise.resolve(0),
    needPostOverview ? prisma.post.count({ where: { status: "PUBLISHED" } }) : Promise.resolve(0),
    needAchievementSplit ? prisma.post.count({ where: { type: "ACHIEVEMENT" } }) : Promise.resolve(0),
    isEditor ? prisma.post.count({ where: { status: "PENDING_REVIEW" } }) : Promise.resolve(0),
    needEventOverview ? prisma.event.count() : Promise.resolve(0),
    needEventOverview ? prisma.event.count({ where: { status: "UPCOMING" } }) : Promise.resolve(0),
    isEventManager ? prisma.event.count({ where: { status: "ONGOING" } }) : Promise.resolve(0),
    isAdmin ? prisma.user.count() : Promise.resolve(0),
    needSubmissions ? prisma.eventSubmission.count({ where: { status: "PENDING", deletedAt: null } }) : Promise.resolve(0),
    needCopyrightOverview
      ? prisma.copyrightSubmission.count({
          where: { applicationStatus: { in: ["finance_review", "under_review", "pending_final_approval", "pending_fees", "final_review"] } },
        })
      : Promise.resolve(0),
    (isWriter || isMediaOffice) ? prisma.post.count({ where: { ...postScope } }) : Promise.resolve(0),
    (isWriter || isMediaOffice) ? prisma.post.count({ where: { ...postScope, status: "DRAFT" } }) : Promise.resolve(0),
    (isWriter || isMediaOffice) ? prisma.post.count({ where: { ...postScope, status: "PUBLISHED" } }) : Promise.resolve(0),
    isMediaOffice ? prisma.post.count({ where: { ...postScope, type: "ACHIEVEMENT" } }) : Promise.resolve(0),
    isMediaOffice ? prisma.post.count({ where: { ...postScope, type: "ACHIEVEMENT", status: "DRAFT" } }) : Promise.resolve(0),
    isMediaOffice ? prisma.post.count({ where: { ...postScope, type: "ACHIEVEMENT", status: "PUBLISHED" } }) : Promise.resolve(0),
    isAdmin || isEditor
      ? prisma.post.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { author: { select: { nameAr: true } }, category: true },
        })
      : Promise.resolve([]),
    isEventManager
      ? prisma.event.findMany({ take: 5, orderBy: { startDate: "desc" }, include: { eventCategory: true } })
      : Promise.resolve([]),
    (isWriter || isMediaOffice)
      ? prisma.post.findMany({
          where: { ...postScope, ...(isMediaOffice ? { type: { not: "ACHIEVEMENT" } } : {}) },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { author: { select: { nameAr: true } }, category: true },
        })
      : Promise.resolve([]),
    isMediaOffice
      ? prisma.post.findMany({
          where: { ...postScope, type: "ACHIEVEMENT" },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { author: { select: { nameAr: true } }, category: true },
        })
      : Promise.resolve([]),
    isCopyrightStaff
      ? prisma.copyrightSubmission.count({ where: copyrightAwaitingWhere(role) })
      : Promise.resolve(0),
    isCopyrightStaff
      ? prisma.copyrightSubmission.count({ where: { applicationStatus: { in: COPYRIGHT_ACTIVE_STATUSES } } })
      : Promise.resolve(0),
    isCopyrightStaff
      ? prisma.copyrightSubmission.findMany({
          where: copyrightAwaitingWhere(role),
          take: 6,
          orderBy: { createdAt: "asc" }, // oldest first — act on the longest-waiting cases
          select: { id: true, applicantName: true, workTitle: true, workCategory: true, createdAt: true, applicationStatus: true },
        })
      : Promise.resolve([]),
    // Directorate dashboard — scoped to the events this user created. The
    // directorate self-publishes now (every event lands APPROVED immediately),
    // so a "published" count would just mirror the total — show a lifecycle
    // status breakdown instead, which is the only way these counts diverge.
    isDirectorate ? prisma.event.count({ where: { createdById: user.id } }) : Promise.resolve(0),
    isDirectorate ? prisma.event.count({ where: { createdById: user.id, status: "UPCOMING" } }) : Promise.resolve(0),
    isDirectorate ? prisma.event.count({ where: { createdById: user.id, status: "ONGOING" } }) : Promise.resolve(0),
    isDirectorate ? prisma.event.count({ where: { createdById: user.id, status: "COMPLETED" } }) : Promise.resolve(0),
    isDirectorate
      ? prisma.event.findMany({
          where: { createdById: user.id },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { eventCategory: true },
        })
      : Promise.resolve([]),
    // Events submitted by a DIRECTORATE user, awaiting this reviewer's decision.
    isEventManager ? prisma.event.count({ where: { reviewStatus: "PENDING" } }) : Promise.resolve(0),
    isEventManager
      ? prisma.event.findMany({
          where: { reviewStatus: "PENDING" },
          take: 5,
          orderBy: { createdAt: "asc" }, // oldest first — longest-waiting submissions surface first
          include: { eventCategory: true },
        })
      : Promise.resolve([]),
    // Per-service applicant counts — only services with a database record can be
    // counted here. Internal Oversight and International Cooperation are email-only
    // (nothing persisted), so they're intentionally excluded from this breakdown.
    isAdmin ? prisma.copyrightSubmission.count() : Promise.resolve(0),
    isAdmin ? prisma.eventSubmission.count({ where: { deletedAt: null } }) : Promise.resolve(0),
  ]);

  // `createdById` is a denormalized plain id (no relation), so resolve the
  // submitting directorate's display name for the event-manager's dashboard
  // lists with a single lookup, same approach as the events list page.
  let creatorNames = {};
  if (isEventManager) {
    const ids = [...new Set([...eventsAwaitingReviewList, ...recentEvents].map((e) => e.createdById).filter(Boolean))];
    if (ids.length) {
      const creators = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameAr: true },
      });
      creatorNames = Object.fromEntries(creators.map((u) => [u.id, u.nameAr]));
    }
  }

  const stats = [];

  if (isAdmin) {
    stats.push(
      { labelAr: "المقالات والأخبار", labelEn: "Articles & News", value: postsCount - achievementsCount, icon: "Newspaper", color: "blue", sub: `${publishedCount} منشور` },
      { labelAr: "الإنجازات", labelEn: "Achievements", value: achievementsCount, icon: "Award", color: "amber", sub: "إنجاز موثّق" },
      { labelAr: "الفعاليات", labelEn: "Events", value: eventsCount, icon: "CalendarDays", color: "green", sub: `${upcomingEventsCount} قادمة` },
      { labelAr: "المستخدمون", labelEn: "Users", value: usersCount, icon: "Users", color: "purple", sub: "مستخدم نشط" },
      { labelAr: "طلبات بانتظار المراجعة", labelEn: "Pending Submissions", value: pendingSubmissionsCount, icon: "Inbox", color: "amber", sub: "طلب فعالية" },
      { labelAr: "طلبات حقوق المؤلف", labelEn: "Copyright Requests", value: pendingCopyrightCount, icon: "FileText", color: "amber", sub: "بانتظار إجراء الموظف" },
    );
  } else if (isEditor) {
    stats.push(
      { labelAr: "بانتظار المراجعة", labelEn: "Pending Review", value: pendingReviewCount, icon: "Clock", color: "amber", sub: "مقال يحتاج مراجعة" },
      { labelAr: "المقالات والأخبار", labelEn: "Articles & News", value: postsCount - achievementsCount, icon: "Newspaper", color: "blue", sub: `${publishedCount} منشور` },
      { labelAr: "الإنجازات", labelEn: "Achievements", value: achievementsCount, icon: "Award", color: "amber", sub: "إنجاز موثّق" },
      { labelAr: "الفعاليات القادمة", labelEn: "Upcoming Events", value: upcomingEventsCount, icon: "CalendarDays", color: "green", sub: `من أصل ${eventsCount} فعالية` },
      { labelAr: "طلبات حقوق المؤلف", labelEn: "Copyright Requests", value: pendingCopyrightCount, icon: "FileText", color: "amber", sub: "بانتظار إجراء الموظف" },
    );
  } else if (isWriter) {
    stats.push(
      { labelAr: "المقالات", labelEn: "Posts", value: myPostsCount, icon: "Newspaper", color: "blue", sub: `${myPublishedCount} منشور` },
      { labelAr: "المسودات", labelEn: "Drafts", value: myDraftsCount, icon: "FileText", color: "amber", sub: "بحاجة لإكمال" },
      { labelAr: "المنشورة", labelEn: "Published", value: myPublishedCount, icon: "CheckCircle", color: "green", sub: "مقال منشور" },
    );
  } else if (isEventManager) {
    stats.push(
      // Cultural-calendar events submitted by a DIRECTORATE account, awaiting
      // approval/rejection — listed first since it's the most time-sensitive queue.
      { labelAr: "فعاليات ثقافية بحاجة لمراجعة", labelEn: "Events Awaiting Review", value: eventsAwaitingReviewCount, icon: "Inbox", color: "amber", sub: "مرسلة من المديريات" },
      { labelAr: "الفعاليات القادمة", labelEn: "Upcoming Events", value: upcomingEventsCount, icon: "CalendarDays", color: "green", sub: `من أصل ${eventsCount} فعالية` },
      { labelAr: "الفعاليات الجارية", labelEn: "Ongoing Events", value: ongoingEventsCount, icon: "Theater", color: "amber", sub: "قيد التنفيذ حالياً" },
      { labelAr: "طلبات اقتراح فعاليات", labelEn: "Citizen Proposals", value: pendingSubmissionsCount, icon: "FileText", color: "purple", sub: "مقترح من مواطن" },
    );
  } else if (isMediaOffice) {
    stats.push(
      { labelAr: "الأخبار", labelEn: "News", value: myPostsCount - myAchievementsCount, icon: "Newspaper", color: "blue", sub: `${myPublishedCount - myPublishedAchievementsCount} منشورة` },
      { labelAr: "الإنجازات", labelEn: "Achievements", value: myAchievementsCount, icon: "Award", color: "amber", sub: `${myPublishedAchievementsCount} منشورة` },
      { labelAr: "المسودات", labelEn: "Drafts", value: myDraftsCount, icon: "FileText", color: "purple", sub: `${myDraftsCount} خبر/إنجاز` },
    );
  } else if (isViewer) {
    stats.push(
      { labelAr: "المقالات المنشورة", labelEn: "Published Posts", value: publishedCount, icon: "Newspaper", color: "blue", sub: `من أصل ${postsCount}` },
      { labelAr: "الفعاليات القادمة", labelEn: "Upcoming Events", value: upcomingEventsCount, icon: "CalendarDays", color: "green", sub: `من أصل ${eventsCount} فعالية` },
    );
  } else if (isCopyrightStaff) {
    stats.push(
      { labelAr: "بانتظار إجرائك", labelEn: "Awaiting You", value: copyrightAwaitingCount, icon: "Inbox", color: "amber", sub: COPYRIGHT_STAGE_LABEL[role] || "مرحلتك في المسار" },
      { labelAr: "معاملات قيد التنفيذ", labelEn: "Active Cases", value: copyrightActiveCount, icon: "FileText", color: "blue", sub: "إجمالي قيد المعالجة" },
    );
  } else if (isDirectorate) {
    stats.push(
      { labelAr: "إجمالي فعاليات المديرية", labelEn: "Directorate Events", value: dirEventsCount, icon: "CalendarDays", color: "blue", sub: "فعالية" },
      { labelAr: "القادمة", labelEn: "Upcoming", value: dirUpcomingCount, icon: "Clock", color: "amber", sub: "لم تبدأ بعد" },
      { labelAr: "الجارية", labelEn: "Ongoing", value: dirOngoingCount, icon: "Theater", color: "green", sub: "قيد التنفيذ حالياً" },
      { labelAr: "منتهية", labelEn: "Completed", value: dirCompletedCount, icon: "CheckCircle", color: "purple", sub: "اكتملت" },
    );
  }

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مرحباً، {user.nameAr} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            لوحة التحكم الرئيسية — وزارة الثقافة السورية
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.labelAr} {...stat} />
          ))}
        </div>

        {/* Per-service applicant counts — admin only */}
        {isAdmin && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-gray-800">عدد المتقدمين على كل خدمة</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-4">
                <span className="text-sm font-semibold text-gray-700">حماية حقوق المؤلف</span>
                <span className="text-xl font-black text-gray-900 font-sans">{totalCopyrightSubmissionsCount.toLocaleString("en-GB")}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-4">
                <span className="text-sm font-semibold text-gray-700">اقتراح فعالية ثقافية</span>
                <span className="text-xl font-black text-gray-900 font-sans">{totalEventSubmissionsCount.toLocaleString("en-GB")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main activity section — tailored to what each role actually acts on */}
        {(isAdmin || isEditor) && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">آخر المقالات</h2>
              <a href="/admin/posts" className="text-sm text-[#A48E68] hover:underline">
                عرض الكل
              </a>
            </div>
            <RecentPosts posts={recentPosts} />
          </div>
        )}

        {(isWriter || isMediaOffice) && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">
                {isMediaOffice ? "آخر الأخبار" : "آخر المقالات"}
              </h2>
              <a href="/admin/posts" className="text-sm text-[#A48E68] hover:underline">
                عرض الكل
              </a>
            </div>
            <RecentPosts posts={myRecentPosts} />
          </div>
        )}

        {isMediaOffice && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">آخر الإنجازات</h2>
              <a href="/admin/achievements" className="text-sm text-[#A48E68] hover:underline">
                عرض الكل
              </a>
            </div>
            <RecentPosts posts={myRecentAchievements} />
          </div>
        )}

        {isEventManager && eventsAwaitingReviewCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-amber-800">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                فعاليات ثقافية بحاجة لمراجعتك ({eventsAwaitingReviewCount})
              </h2>
              <a href="/admin/events" className="text-sm text-[#A48E68] hover:underline">
                عرض الكل
              </a>
            </div>
            <RecentEvents events={eventsAwaitingReviewList} creatorNames={creatorNames} showCreator />
          </div>
        )}

        {isEventManager && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">آخر الفعاليات</h2>
              <a href="/admin/events" className="text-sm text-[#A48E68] hover:underline">
                عرض الكل
              </a>
            </div>
            <RecentEvents events={recentEvents} creatorNames={creatorNames} showCreator />
          </div>
        )}

        {isCopyrightStaff && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">معاملات بانتظار إجرائك</h2>
              <a href="/admin/copyright" className="text-sm text-[#A48E68] hover:underline">
                عرض كل المعاملات
              </a>
            </div>
            <CopyrightStaffQueue items={copyrightAwaitingList} stageLabel={COPYRIGHT_STAGE_LABEL[role]} />
          </div>
        )}

        {isDirectorate && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">آخر فعاليات المديرية المضافة</h2>
              <a href="/admin/events" className="text-sm text-[#A48E68] hover:underline">
                عرض الكل
              </a>
            </div>
            <RecentEvents events={dirRecentEvents} />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
