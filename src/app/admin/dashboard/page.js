import { redirect } from "next/navigation";
import LanguageReviewQueue from "@/components/admin/LanguageReviewQueue";
import DirectorateActivityPanel from "@/components/admin/DirectorateActivityPanel";
import { MISSING_ENGLISH_WHERE, missingEnglishFields, pendingLanguageReviewWhere } from "@/lib/event-language-review.mjs";
import { buildMonthOptions, monthLabel, monthRange, parseMonthParam } from "@/lib/directorate-activity.mjs";
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


export default async function DashboardPage({ searchParams }) {
  const user = await getCurrentUser();
  // Door staff have no business on the overview: sign-in lands everyone on
  // /admin/dashboard, so this is where their single screen is handed to them.
  if (user.role === ROLES.TICKET_OFFICER) redirect("/admin/scan");
  const role = user.role;

  // Directorate-activity month filter — "" means all-time (the original
  // behaviour). An unparseable value (typed URL, stale link) is treated the
  // same as unset rather than erroring the whole dashboard.
  const params = await searchParams;
  const dirMonth = parseMonthParam(params?.dirMonth) ? params.dirMonth : "";
  const dirMonthRange = dirMonth ? monthRange(dirMonth) : null;

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
  // Proofreads event English and rules on citizen ID submissions — its two
  // queues are the only numbers it can act on.
  const isLanguageReviewer = role === ROLES.LANGUAGE_IDENTITY_REVIEWER;
  // Copyright-protection workflow staff — each acts on one stage of the pipeline.
  const isCopyrightStaff = Boolean(copyrightAwaitingWhere(role));

  const needPostOverview = isAdmin || isEditor || isViewer;
  // Achievements (PostType.ACHIEVEMENT) get their own management section + their
  // own dashboard number — they shouldn't be buried inside the generic "posts" count.
  const needAchievementSplit = isAdmin || isEditor;
  const needEventOverview = isAdmin || isEditor || isEventManager || isViewer || isLanguageReviewer;
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
    untranslatedEventsCount,
    pendingIdentityCount,
    pendingLanguageReviewList,
    pendingLanguageReviewCount,
    directorateAccounts,
    directorateEventGroups,
    directorateDateBounds,
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
    // The language reviewer's actual worklist: events still missing English.
    isLanguageReviewer ? prisma.event.count({ where: MISSING_ENGLISH_WHERE }) : Promise.resolve(0),
    isLanguageReviewer
      ? prisma.citizen.count({ where: { identityStatus: "PENDING" } })
      : Promise.resolve(0),
    // The reviewer's queue: upcoming events not yet signed off, soonest first —
    // the ones about to face the public are the ones worth reading now.
    isLanguageReviewer
      ? prisma.event.findMany({
          where: pendingLanguageReviewWhere(),
          take: 12,
          orderBy: { startDate: "asc" },
          select: { id: true, titleAr: true, titleEn: true, descriptionEn: true, locationEn: true, startDate: true },
        })
      : Promise.resolve([]),
    isLanguageReviewer
      ? prisma.event.count({ where: pendingLanguageReviewWhere() })
      : Promise.resolve(0),
    // Which directorates have fed the calendar and which have not. Inactive
    // accounts are left out — a disabled account is not a silent directorate.
    isLanguageReviewer
      ? prisma.user.findMany({
          where: { role: ROLES.DIRECTORATE, isActive: true },
          select: { id: true, nameAr: true, createdAt: true },
        })
      : Promise.resolve([]),
    // Event.createdById is a denormalized plain id (no relation), so the counts
    // come from a groupBy that is stitched to the accounts above in JS. A month
    // filter narrows to events whose startDate falls in that month; unfiltered,
    // this is every event the directorate ever added (the original behaviour).
    isLanguageReviewer
      ? prisma.event.groupBy({
          by: ["createdById"],
          where: {
            createdById: { not: null },
            ...(dirMonthRange ? { startDate: { gte: dirMonthRange.start, lt: dirMonthRange.end } } : {}),
          },
          _count: { _all: true },
          _max: { createdAt: true, startDate: true },
        })
      : Promise.resolve([]),
    // Powers the filter's month list: a directorate that only ever posted
    // outside the current year must still be reachable, not silently excluded.
    isLanguageReviewer
      ? prisma.event.aggregate({ _min: { startDate: true }, _max: { startDate: true } })
      : Promise.resolve(null),
  ]);

  // Directorates ordered so the silent ones surface first, then the least active.
  // "Last activity" means something different per mode: unfiltered it is when
  // the directorate last touched the calendar at all (createdAt); inside a
  // selected month there is no "last" worth distinguishing from the events
  // themselves, so it reports the latest event date within that month instead.
  const directorateActivity = directorateAccounts
    .map((account) => {
      const group = directorateEventGroups.find((row) => row.createdById === account.id);
      return {
        id: account.id,
        nameAr: account.nameAr,
        createdAt: account.createdAt,
        eventCount: group?._count?._all ?? 0,
        lastEventAt: (dirMonthRange ? group?._max?.startDate : group?._max?.createdAt) ?? null,
      };
    })
    .sort((a, b) => a.eventCount - b.eventCount || a.nameAr.localeCompare(b.nameAr, "ar"));
  const silentDirectorates = directorateActivity.filter((row) => row.eventCount === 0);

  const dirMonthOptions = buildMonthOptions(new Date(), [
    directorateDateBounds?._min?.startDate?.getUTCFullYear(),
    directorateDateBounds?._max?.startDate?.getUTCFullYear(),
  ].filter(Boolean));

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
  } else if (isLanguageReviewer) {
    stats.push(
      { labelAr: "قادمة بانتظار التدقيق", labelEn: "Awaiting Language Review", value: pendingLanguageReviewCount, icon: "Inbox", color: "amber", sub: "فعالية لم تُدقَّق بعد" },
      { labelAr: "فعاليات بلا ترجمة إنجليزية", labelEn: "Events Missing English", value: untranslatedEventsCount, icon: "FileText", color: "amber", sub: `من أصل ${eventsCount} فعالية` },
      { labelAr: "هويات بانتظار التدقيق", labelEn: "Identities Awaiting Review", value: pendingIdentityCount, icon: "Clock", color: "purple", sub: "طلب توثيق مواطن" },
      { labelAr: "مديريات لم تنزّل فعاليات", labelEn: "Directorates With No Events", value: silentDirectorates.length, icon: "Users", color: "amber", sub: dirMonth ? monthLabel(dirMonth) : `من أصل ${directorateActivity.length} مديرية` },
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

        {isLanguageReviewer && (
          <LanguageReviewQueue
            events={pendingLanguageReviewList.map((ev) => ({
              id: ev.id,
              titleAr: ev.titleAr,
              startDate: ev.startDate.toISOString(),
              missing: missingEnglishFields(ev),
            }))}
          />
        )}

        {isLanguageReviewer && (
          <DirectorateActivityPanel
            directorates={directorateActivity.map((dir) => ({
              ...dir,
              createdAt: dir.createdAt.toISOString(),
              lastEventAt: dir.lastEventAt ? new Date(dir.lastEventAt).toISOString() : null,
            }))}
            monthOptions={dirMonthOptions}
            month={dirMonth}
          />
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
