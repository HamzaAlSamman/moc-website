"use client";

import { useRouter } from "next/navigation";

// Dates render en-GB and LTR across the admin (see RecentEvents), so an Arabic
// sentence carrying one has to isolate it or the slashes reorder.
function ShortDate({ value }) {
  if (!value) return "—";
  return <bdi dir="ltr">{new Date(value).toLocaleDateString("en-GB")}</bdi>;
}

// Which directorates fed the calendar, optionally narrowed to one month. The
// filter is a plain navigation (dirMonth in the URL) so the dashboard's other
// server-rendered sections stay untouched by it.
export default function DirectorateActivityPanel({ directorates, monthOptions, month }) {
  const router = useRouter();

  function onMonthChange(value) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("dirMonth", value);
    else params.delete("dirMonth");
    router.push(`/admin/dashboard${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-gray-800">نشاط المديريات على الروزنامة</h2>
        <select
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="min-h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]"
        >
          <option value="">كل الأشهر</option>
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.labelAr}</option>
          ))}
        </select>
      </div>
      <p className="mb-4 text-xs text-gray-400">
        {month
          ? "المديريات التي لم تنزّل أي فعالية بهذا الشهر تظهر أولاً. لا تُحتسب إلا الفعاليات المضافة من حساب المديرية نفسه."
          : "المديريات التي لم تنزّل أي فعالية تظهر أولاً. لا تُحتسب إلا الفعاليات المضافة من حساب المديرية نفسه."}
      </p>
      {directorates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          لا توجد حسابات مديريات مفعّلة.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {directorates.map((dir) => (
            <li key={dir.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{dir.nameAr}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {dir.eventCount === 0
                    ? (month ? "لا نشاط بهذا الشهر — الحساب مُنشأ منذ " : "الحساب مُنشأ منذ ")
                    : (month ? "آخر فعالية بهذا الشهر " : "آخر إضافة ")}
                  <ShortDate value={dir.eventCount === 0 ? dir.createdAt : dir.lastEventAt} />
                </p>
              </div>
              {dir.eventCount === 0 ? (
                <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700">
                  لم تنزّل أي فعالية
                </span>
              ) : (
                <span className="rounded-full bg-[#003D33]/8 px-3 py-1 text-[11px] font-bold text-[#003D33]">
                  {dir.eventCount.toLocaleString("en-GB")} فعالية
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
