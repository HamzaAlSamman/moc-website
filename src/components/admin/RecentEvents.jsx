import Link from "next/link";

const statusBadge = {
  UPCOMING:  { label: "قادمة",  class: "bg-[#003D33]/8 text-[#003D33] border border-[#003D33]/15" },
  ONGOING:   { label: "جارية",  class: "bg-[#A48E68]/10 text-[#8B7654] border border-[#A48E68]/20" },
  COMPLETED: { label: "منتهية", class: "bg-gray-50 text-gray-500 border border-gray-250" },
  CANCELLED: { label: "ملغاة",  class: "bg-red-50 text-red-600 border border-red-150" },
};

// reviewStatus is separate from the lifecycle status above — APPROVED shows
// nothing extra (the absence of a flag means "live"); PENDING/REJECTED do.
const reviewBadge = {
  PENDING:  { label: "بانتظار المراجعة", class: "bg-amber-50 text-amber-700 border border-amber-200" },
  REJECTED: { label: "مرفوضة",           class: "bg-red-50 text-red-600 border border-red-150" },
};

export default function RecentEvents({ events, creatorNames = {}, showCreator = false }) {
  if (!events.length) {
    return <p className="py-8 text-center text-sm text-gray-400">لا توجد فعاليات بعد</p>;
  }

  // Resolve the submitting directorate's display name from the id→name map.
  const creatorOf = (event) => (event.createdById && creatorNames[event.createdById]) || "—";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 text-right text-xs font-semibold text-gray-500">الفعالية</th>
            {showCreator && (
              <th className="pb-3 text-right text-xs font-semibold text-gray-500 hidden lg:table-cell">المديرية</th>
            )}
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">الموقع</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500">الحالة</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">التاريخ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {events.map((event) => {
            const badge = statusBadge[event.status];
            return (
              <tr key={event.id} className="group hover:bg-gray-50">
                <td className="py-3 pr-0">
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="font-medium text-gray-800 group-hover:text-[#003D33]"
                  >
                    {event.titleAr.length > 50 ? event.titleAr.slice(0, 50) + "…" : event.titleAr}
                  </Link>
                </td>
                {showCreator && (
                  <td className="py-3 text-gray-500 hidden lg:table-cell">{creatorOf(event)}</td>
                )}
                <td className="py-3 text-gray-500 hidden sm:table-cell">{event.location || "—"}</td>
                <td className="py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.class}`}>
                      {badge.label}
                    </span>
                    {event.reviewStatus && event.reviewStatus !== "APPROVED" && reviewBadge[event.reviewStatus] && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${reviewBadge[event.reviewStatus].class}`}>
                        {reviewBadge[event.reviewStatus].label}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-gray-400 hidden sm:table-cell">
                  <span className="inline-block" dir="ltr">{new Date(event.startDate).toLocaleDateString("en-GB")}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
