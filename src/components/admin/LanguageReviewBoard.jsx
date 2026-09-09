"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages, RotateCcw, Search } from "lucide-react";

const STATUS_LABEL = { UPCOMING: "قادمة", ONGOING: "جارية", COMPLETED: "منتهية", CANCELLED: "ملغاة" };

const TABS = [
  { key: "pending", labelAr: "بحاجة تدقيق", countKey: "pending" },
  { key: "done", labelAr: "تم تدقيقها", countKey: "done" },
  { key: "missing", labelAr: "بلا ترجمة", countKey: "missing" },
];

const EMPTY_MESSAGE = {
  pending: "لا توجد فعاليات قادمة بانتظار التدقيق. 🎉",
  done: "لم يتم اعتماد أي فعالية بعد.",
  missing: "كل الفعاليات مترجمة — لا يوجد نقص.",
};

function ShortDate({ value }) {
  if (!value) return "—";
  return <bdi dir="ltr">{new Date(value).toLocaleDateString("en-GB")}</bdi>;
}

export default function LanguageReviewBoard({ events, tab, search, counts, pageSize }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState(search || "");

  function go(nextTab, nextQuery) {
    const params = new URLSearchParams();
    if (nextTab !== "pending") params.set("tab", nextTab);
    if (nextQuery) params.set("q", nextQuery);
    router.push(`/admin/language-review${params.toString() ? `?${params}` : ""}`);
  }

  async function setReviewed(event, reviewed) {
    setBusy(event.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/events/${event.id}/language-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
      setNotice(reviewed ? `تم اعتماد التدقيق: ${event.titleAr}` : `تم التراجع عن الاعتماد: ${event.titleAr}`);
      router.refresh();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => go(item.key, query)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                tab === item.key
                  ? "bg-[#003D33] text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.labelAr}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                tab === item.key ? "bg-white/15" : "bg-slate-100 text-slate-500"
              }`}>
                {(counts[item.countKey] ?? 0).toLocaleString("en-GB")}
              </span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); go(tab, query.trim()); }}
          className="relative min-w-[220px] flex-1"
        >
          <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالعنوان أو الموقع"
            className="min-h-11 w-full rounded-xl border border-slate-200 pr-10 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]"
          />
        </form>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm font-bold text-[#054239]">{notice}</p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-right text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
            <tr>
              <th className="p-4 font-bold">الفعالية</th>
              <th className="p-4 font-bold">التاريخ</th>
              <th className="p-4 font-bold">المحافظة</th>
              <th className="p-4 font-bold">{tab === "done" ? "اعتُمدت" : "الترجمة"}</th>
              <th className="p-4 font-bold">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => (
              <tr key={event.id} className="align-top">
                <td className="p-4">
                  <a href={`/admin/events/${event.id}`} className="font-bold text-slate-800 hover:text-[#A48E68]">
                    {event.titleAr}
                  </a>
                  {event.titleEn && (
                    <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{event.titleEn}</p>
                  )}
                </td>
                <td className="p-4 text-xs text-slate-500">
                  <ShortDate value={event.startDate} />
                  <p className="mt-0.5 text-slate-400">{STATUS_LABEL[event.status] || event.status}</p>
                </td>
                <td className="p-4 text-xs text-slate-500">{event.governorate || "—"}</td>
                <td className="p-4">
                  {tab === "done" ? (
                    <div className="text-xs text-slate-500">
                      <ShortDate value={event.reviewedAt} />
                      <p className="mt-0.5 text-slate-400">{event.reviewedBy || "—"}</p>
                    </div>
                  ) : event.missing.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {event.missing.map((field) => (
                        <span key={field} className="rounded-full bg-[#A48E68]/10 px-2.5 py-1 text-[11px] font-bold text-[#8B7654]">
                          ناقص: {field}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                      <Languages size={12} /> مكتملة
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {tab === "done" ? (
                    <button
                      onClick={() => setReviewed(event, false)}
                      disabled={busy === event.id}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RotateCcw size={15} />
                      {busy === event.id ? "…" : "تراجع"}
                    </button>
                  ) : event.missing.length ? (
                    <a
                      href={`/admin/events/${event.id}`}
                      className="inline-flex min-h-11 items-center rounded-xl border border-[#A48E68]/40 px-3 text-sm font-bold text-[#8B7654] hover:bg-[#A48E68]/5"
                    >
                      أكمل الترجمة
                    </a>
                  ) : (
                    <button
                      onClick={() => setReviewed(event, true)}
                      disabled={busy === event.id}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      <Check size={16} />
                      {busy === event.id ? "…" : "تم التدقيق"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!events.length && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-500">
                  {search ? "لا توجد نتائج مطابقة للبحث." : EMPTY_MESSAGE[tab]}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {events.length >= pageSize && (
        <p className="text-xs text-slate-400">
          تُعرض أول {pageSize} فعالية من هذه القائمة — استخدم البحث لتضييق النتائج.
        </p>
      )}
    </div>
  );
}
