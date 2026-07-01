"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { can } from "@/lib/permissions";

const statusBadge = {
  UPCOMING:  "bg-[#003D33]/8 text-[#003D33] border border-[#003D33]/15",
  ONGOING:   "bg-[#A48E68]/10 text-[#8B7654] border border-[#A48E68]/20",
  COMPLETED: "bg-white text-red-500 border border-red-400",
  CANCELLED: "bg-red-50 text-red-600 border border-red-150",
};
const statusLabel = {
  UPCOMING: "قادمة", ONGOING: "جارية", COMPLETED: "منتهية", CANCELLED: "ملغاة",
};

const reviewBadge = {
  PENDING:  "bg-amber-50 text-amber-700 border border-amber-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-150",
};
const reviewLabel = {
  PENDING: "بانتظار المراجعة", REJECTED: "مرفوضة",
};

export default function EventsTable({ events, userRole, canReview = false, creatorNames = {}, showCreator = false, currentUserId = null }) {
  // Resolve the submitting directorate's display name from the id→name map.
  const creatorOf = (ev) => (ev.createdById && creatorNames[ev.createdById]) || "—";
  const router = useRouter();
  const [deleting, setDeleting] = useState(null);

  // Acting on a row is gated by ownership: EDIT_ANY/DELETE_ANY act on every
  // event, while EDIT_OWN/DELETE_OWN (the DIRECTORATE role) act only on the
  // events they created. Others' rows are visible but read-only.
  const isOwner = (ev) => !!currentUserId && ev.createdById === currentUserId;
  const canEditRow = (ev) => can(userRole, "EDIT_ANY_EVENT") || (can(userRole, "EDIT_OWN_EVENT") && isOwner(ev));
  const canDeleteRow = (ev) => can(userRole, "DELETE_ANY_EVENT") || (can(userRole, "DELETE_OWN_EVENT") && isOwner(ev));

  async function deleteEvent(id) {
    if (!confirm("هل أنت متأكد من حذف هذه الفعالية؟")) return;
    setDeleting(id);
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  }

  // A small review-status pill rendered alongside the lifecycle status. Approved
  // events show nothing extra — the absence of a flag means "live".
  const ReviewPill = ({ ev }) =>
    ev.reviewStatus && ev.reviewStatus !== "APPROVED" ? (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${reviewBadge[ev.reviewStatus]}`}>
        {reviewLabel[ev.reviewStatus]}
      </span>
    ) : null;

  // Reviewers must open the full event (title, description, images, dates...)
  // before deciding — approve/reject live only on the detail page, never as a
  // blind one-click action from the list.
  const ReviewAction = ({ ev }) =>
    canReview && ev.reviewStatus === "PENDING" ? (
      <Link href={`/admin/events/${ev.id}`}
        className="rounded px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50">
        عرض ومراجعة
      </Link>
    ) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الفعالية</th>
              {showCreator && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden lg:table-cell">المديرية</th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">الموقع</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden md:table-cell">التاريخ</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {events.length === 0 && (
              <tr><td colSpan={showCreator ? 6 : 5} className="py-12 text-center text-gray-400">لا توجد فعاليات</td></tr>
            )}
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {canEditRow(ev) ? (
                    <Link href={`/admin/events/${ev.id}`} className="font-medium text-gray-800 hover:text-[#003D33]">
                      {ev.titleAr.length > 55 ? ev.titleAr.slice(0, 55) + "…" : ev.titleAr}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-800">
                      {ev.titleAr.length > 55 ? ev.titleAr.slice(0, 55) + "…" : ev.titleAr}
                    </span>
                  )}
                </td>
                {showCreator && (
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{creatorOf(ev)}</td>
                )}
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{ev.location ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                  {new Date(ev.startDate).toLocaleDateString("en-GB")}
                  {ev.endDate && ` — ${new Date(ev.endDate).toLocaleDateString("en-GB")}`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[ev.status]}`}>
                      {statusLabel[ev.status]}
                    </span>
                    <ReviewPill ev={ev} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ReviewAction ev={ev} />
                    {/* "عرض ومراجعة" already opens this same page for a pending event — avoid a redundant second link to it. */}
                    {canEditRow(ev) && !(canReview && ev.reviewStatus === "PENDING") && (
                      <Link href={`/admin/events/${ev.id}`} className="rounded px-2 py-1 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium">
                        تعديل
                      </Link>
                    )}
                    {canDeleteRow(ev) && (
                      <button onClick={() => deleteEvent(ev.id)} disabled={deleting === ev.id}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50">
                        {deleting === ev.id ? "..." : "حذف"}
                      </button>
                    )}
                    {!canEditRow(ev) && !canDeleteRow(ev) && !(canReview && ev.reviewStatus === "PENDING") && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
        {events.length === 0 && (
          <p className="py-12 text-center text-gray-400 text-sm">لا توجد فعاليات</p>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="rounded-xl border border-gray-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex justify-between items-start gap-3">
              {canEditRow(ev) ? (
                <Link href={`/admin/events/${ev.id}`} className="font-bold text-gray-800 hover:text-[#003D33] text-sm flex-1 min-w-0 line-clamp-2 text-start">
                  {ev.titleAr}
                </Link>
              ) : (
                <span className="font-bold text-gray-800 text-sm flex-1 min-w-0 line-clamp-2 text-start">
                  {ev.titleAr}
                </span>
              )}
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge[ev.status]}`}>
                  {statusLabel[ev.status]}
                </span>
                <ReviewPill ev={ev} />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs border-t border-gray-100 pt-3 text-gray-500 text-start">
              {showCreator && <p>المديرية: {creatorOf(ev)}</p>}
              <p>الموقع: {ev.location ?? "—"}</p>
              <p>
                التاريخ: {new Date(ev.startDate).toLocaleDateString("en-GB")}
                {ev.endDate && ` — ${new Date(ev.endDate).toLocaleDateString("en-GB")}`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              {canReview && ev.reviewStatus === "PENDING" && (
                <Link href={`/admin/events/${ev.id}`}
                  className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition">
                  عرض ومراجعة
                </Link>
              )}
              {canEditRow(ev) && !(canReview && ev.reviewStatus === "PENDING") && (
                <Link href={`/admin/events/${ev.id}`} className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium transition">
                  تعديل
                </Link>
              )}
              {canDeleteRow(ev) && (
                <button onClick={() => deleteEvent(ev.id)} disabled={deleting === ev.id}
                  className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-100 transition disabled:opacity-50">
                  {deleting === ev.id ? "..." : "حذف"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
