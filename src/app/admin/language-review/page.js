import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import LanguageReviewBoard from "@/components/admin/LanguageReviewBoard";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  MISSING_ENGLISH_WHERE,
  eventTitleSearchWhere,
  missingEnglishFields,
  pendingLanguageReviewWhere,
} from "@/lib/event-language-review.mjs";

export const dynamic = "force-dynamic";

export const metadata = { title: "التدقيق اللغوي — لوحة التحكم" };

const TABS = ["pending", "done", "missing"];
const PAGE_SIZE = 40;

const SELECT = {
  id: true, titleAr: true, titleEn: true, descriptionEn: true, locationEn: true,
  startDate: true, endDate: true, status: true, governorate: true,
  languageReviewedAt: true, languageReviewedById: true,
};

export default async function LanguageReviewPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!can(user.role, "REVIEW_EVENT_LANGUAGE")) redirect("/admin/dashboard");

  const params = await searchParams;
  const tab = TABS.includes(params?.tab) ? params.tab : "pending";
  const search = (params?.q || "").trim();
  const searchWhere = eventTitleSearchWhere(search);

  // AND rather than a merged object: both the tab filter and the search carry
  // their own OR, and merging them would silently widen one into the other.
  const withSearch = (base) => (searchWhere ? { AND: [base, searchWhere] } : base);

  const TAB_WHERE = {
    pending: pendingLanguageReviewWhere(),
    done: { languageReviewedAt: { not: null } },
    missing: MISSING_ENGLISH_WHERE,
  };

  // Reviewed events read newest-decision-first (what did I just sign off?);
  // the two work queues read soonest-first (what faces the public next?).
  const ORDER = {
    pending: { startDate: "asc" },
    done: { languageReviewedAt: "desc" },
    missing: { startDate: "asc" },
  };

  const [rows, pendingCount, doneCount, missingCount] = await Promise.all([
    prisma.event.findMany({
      where: withSearch(TAB_WHERE[tab]),
      orderBy: ORDER[tab],
      take: PAGE_SIZE,
      select: SELECT,
    }),
    prisma.event.count({ where: pendingLanguageReviewWhere() }),
    prisma.event.count({ where: { languageReviewedAt: { not: null } } }),
    prisma.event.count({ where: MISSING_ENGLISH_WHERE }),
  ]);

  // languageReviewedById is a denormalized plain id, same as createdById — one
  // lookup turns the ids on this page into names.
  const reviewerIds = [...new Set(rows.map((r) => r.languageReviewedById).filter(Boolean))];
  const reviewers = reviewerIds.length
    ? await prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, nameAr: true } })
    : [];
  const reviewerNames = Object.fromEntries(reviewers.map((r) => [r.id, r.nameAr]));

  const events = rows.map((row) => ({
    id: row.id,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    governorate: row.governorate,
    status: row.status,
    startDate: row.startDate.toISOString(),
    reviewedAt: row.languageReviewedAt?.toISOString() || null,
    reviewedBy: row.languageReviewedById ? reviewerNames[row.languageReviewedById] || "—" : null,
    missing: missingEnglishFields(row),
  }));

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <header>
          <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">الروزنامة الثقافية</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">التدقيق اللغوي للفعاليات</h1>
          <p className="mt-1 text-sm text-slate-500">
            مراجعة النص الإنجليزي للفعاليات القادمة واعتمادها — مع إمكانية التراجع عن أي اعتماد.
          </p>
        </header>
        <LanguageReviewBoard
          events={events}
          tab={tab}
          search={search}
          counts={{ pending: pendingCount, done: doneCount, missing: missingCount }}
          pageSize={PAGE_SIZE}
        />
      </div>
    </AdminShell>
  );
}
