"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", labelAr: "كل الحالات" },
  { value: "UPCOMING", labelAr: "قادمة" },
  { value: "ONGOING", labelAr: "جارية" },
  { value: "COMPLETED", labelAr: "منتهية" },
  { value: "CANCELLED", labelAr: "ملغاة" },
];

const REVIEW_OPTIONS = [
  { value: "", labelAr: "كل المراجعات" },
  { value: "PENDING", labelAr: "بانتظار المراجعة" },
  { value: "APPROVED", labelAr: "معتمدة" },
  { value: "REJECTED", labelAr: "مرفوضة" },
];

const LANG_OPTIONS = [
  { value: "", labelAr: "كل حالات التدقيق" },
  { value: "pending", labelAr: "بحاجة تدقيق لغوي" },
  { value: "done", labelAr: "تم تدقيقها" },
  { value: "missing", labelAr: "بلا ترجمة إنجليزية" },
];

const SELECT_CLASS =
  "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]";

export default function EventsFilterBar({ filters, total, shown, showLanguageFilter, canReview }) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.q || "");

  // Every control writes the whole filter set back to the URL, so the server
  // component stays the single source of truth and the browser Back button
  // walks through filter states like any other navigation.
  function apply(patch) {
    const next = { ...filters, q: query.trim(), ...patch, page: patch.page ?? 1 };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === "page" && value === 1)) params.set(key, String(value));
    }
    router.push(`/admin/events${params.toString() ? `?${params}` : ""}`);
  }

  const hasFilters = Boolean(filters.q || filters.status || filters.review || filters.lang);

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); apply({}); }} className="relative min-w-[240px] flex-1">
          <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بعنوان الفعالية أو الموقع"
            className="min-h-11 w-full rounded-xl border border-slate-200 pr-10 pl-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]"
          />
        </form>

        <select value={filters.status || ""} onChange={(e) => apply({ status: e.target.value })} className={SELECT_CLASS}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
        </select>

        {canReview && (
          <select value={filters.review || ""} onChange={(e) => apply({ review: e.target.value })} className={SELECT_CLASS}>
            {REVIEW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
          </select>
        )}

        {showLanguageFilter && (
          <select value={filters.lang || ""} onChange={(e) => apply({ lang: e.target.value })} className={SELECT_CLASS}>
            {LANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
          </select>
        )}

        <button
          onClick={() => apply({})}
          className="min-h-11 rounded-xl bg-[#003D33] px-5 text-sm font-bold text-white"
        >
          بحث
        </button>

        {hasFilters && (
          <button
            onClick={() => { setQuery(""); router.push("/admin/events"); }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-500 hover:bg-slate-50"
          >
            <X size={15} /> إلغاء الفلاتر
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {hasFilters
          ? `${total.toLocaleString("en-GB")} فعالية مطابقة — تُعرض ${shown.toLocaleString("en-GB")}`
          : `${total.toLocaleString("en-GB")} فعالية — تُعرض ${shown.toLocaleString("en-GB")}`}
      </p>
    </div>
  );
}
