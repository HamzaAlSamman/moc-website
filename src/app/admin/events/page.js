import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import EventsTable from "@/components/admin/EventsTable";
import { can } from "@/lib/permissions";

export default async function EventsPage() {
  const user = await getCurrentUser();

  // Events are an EVENT_MANAGER/editor area — this list had no guard, so any
  // logged-in role (e.g. the Media Office) could open it by typing the URL even
  // though it's hidden from their sidebar. Gate it on the same permission the
  // sidebar uses for the Events link.
  if (!can(user.role, "CREATE_EVENT")) redirect("/admin/dashboard");

  // VIEW_ANY_EVENT roles (incl. DIRECTORATE) see the whole list; everyone else
  // sees only the events they created. Acting on a row (edit/delete) is gated
  // separately per-row inside the table by ownership.
  const canReview = can(user.role, "REVIEW_EVENT");
  const seesAll = can(user.role, "VIEW_ANY_EVENT");
  const events = await prisma.event.findMany({
    where: seesAll ? undefined : { createdById: user.id },
    orderBy: { startDate: "desc" },
  });

  // `createdById` is a denormalized plain id (no relation), so resolve the
  // submitting directorate's display name with a single lookup and hand the
  // table a id→name map. Only the full-list view needs this column.
  let creatorNames = {};
  if (seesAll) {
    const ids = [...new Set(events.map((e) => e.createdById).filter(Boolean))];
    if (ids.length) {
      const creators = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameAr: true },
      });
      creatorNames = Object.fromEntries(creators.map((u) => [u.id, u.nameAr]));
    }
  }

  // Surface the review queue first for reviewers.
  const pending = canReview ? events.filter((e) => e.reviewStatus === "PENDING") : [];

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الفعاليات الثقافية</h1>
            <p className="mt-1 text-sm text-gray-500">{events.length} فعالية</p>
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
      </div>
    </AdminShell>
  );
}
