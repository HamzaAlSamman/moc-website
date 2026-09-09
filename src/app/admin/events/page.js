import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import EventsTable from "@/components/admin/EventsTable";
import EventsFilterBar from "@/components/admin/EventsFilterBar";
import EventsPagination from "@/components/admin/EventsPagination";
import { can } from "@/lib/permissions";
import {
  MISSING_ENGLISH_WHERE,
  eventTitleSearchWhere,
  pendingLanguageReviewWhere,
} from "@/lib/event-language-review.mjs";

const PAGE_SIZE = 50;
const STATUSES = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"];
const REVIEWS = ["PENDING", "APPROVED", "REJECTED"];
const LANG_FILTERS = {
  pending: () => pendingLanguageReviewWhere(),
  done: () => ({ languageReviewedAt: { not: null } }),
  missing: () => MISSING_ENGLISH_WHERE,
};

export default async function EventsPage({ searchParams }) {
  const user = await getCurrentUser();

  // Events are an EVENT_MANAGER/editor area — this list had no guard, so any
  // logged-in role (e.g. the Media Office) could open it by typing the URL even
  // though it's hidden from their sidebar. Gate it on the same permission the
  // sidebar uses for the Events link.
  if (!can(user.role, "VIEW_EVENTS")) redirect("/admin/dashboard");

  const params = await searchParams;
  const filters = {
    q: (params?.q || "").trim(),
    status: STATUSES.includes(params?.status) ? params.status : "",
    review: REVIEWS.includes(params?.review) ? params.review : "",
    lang: LANG_FILTERS[params?.lang] ? params.lang : "",
  };
  const page = Math.max(1, Number(params?.page) || 1);

  const canReview = can(user.role, "REVIEW_EVENT");
  const canReviewLanguage = can(user.role, "REVIEW_EVENT_LANGUAGE");
  // VIEW_ANY_EVENT roles (incl. DIRECTORATE) see the whole list; everyone else
  // sees only the events they created. Acting on a row (edit/delete) is gated
  // separately per-row inside the table by ownership.
  const seesAll = can(user.role, "VIEW_ANY_EVENT");

  // The list used to load every event unfiltered — fine at ten, not at several
  // hundred. Filters and paging both run in the database now.
  const clauses = [
    ...(seesAll ? [] : [{ createdById: user.id }]),
    ...(filters.status ? [{ status: filters.status }] : []),
    ...(filters.review ? [{ reviewStatus: filters.review }] : []),
    ...(filters.lang ? [LANG_FILTERS[filters.lang]()] : []),
    ...(eventTitleSearchWhere(filters.q) ? [eventTitleSearchWhere(filters.q)] : []),
  ];
  const where = clauses.length ? { AND: clauses } : undefined;

  const [events, total, pending] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.event.count({ where }),
    // The review queue stays unfiltered on purpose: it is a to-do list, not a
    // view of the current filter.
    canReview
      ? prisma.event.findMany({
          where: { reviewStatus: "PENDING", ...(seesAll ? {} : { createdById: user.id }) },
          orderBy: { startDate: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  // `createdById` is a denormalized plain id (no relation), so resolve the
  // submitting directorate's display name with a single lookup and hand the
  // table a id→name map. Only the full-list view needs this column.
  let creatorNames = {};
  if (seesAll) {
    const ids = [...new Set([...events, ...pending].map((e) => e.createdById).filter(Boolean))];
    if (ids.length) {
      const creators = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameAr: true },
      });
      creatorNames = Object.fromEntries(creators.map((u) => [u.id, u.nameAr]));
    }
  }

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الفعاليات الثقافية</h1>
            <p className="mt-1 text-sm text-gray-500">{total.toLocaleString("en-GB")} فعالية</p>
          </div>
          {can(user.role, "CREATE_EVENT") && (
            <a
              href="/admin/events/new"
              className="rounded-lg bg-[#003D33] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#002B24]"
            >
              + فعالية جديدة
            </a>
          )}
        </div>

        <EventsFilterBar
          filters={filters}
          total={total}
          shown={events.length}
          showLanguageFilter={canReviewLanguage}
          canReview={canReview}
        />

        {canReview && pending.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              بانتظار المراجعة ({pending.length})
            </h2>
            <EventsTable events={pending} userRole={user.role} canReview creatorNames={creatorNames} showCreator={seesAll} currentUserId={user.id} />
          </div>
        )}

        <EventsTable events={events} userRole={user.role} canReview={canReview} creatorNames={creatorNames} showCreator={seesAll} currentUserId={user.id} />

        <EventsPagination page={page} pageSize={PAGE_SIZE} total={total} filters={filters} />
      </div>
    </AdminShell>
  );
}
