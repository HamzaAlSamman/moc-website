"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Play, RefreshCw, Search, Send, ShieldCheck, XCircle } from "lucide-react";

import { OUTBOX_STATUS_LABELS } from "@/lib/notification-outbox-core.mjs";

const STATUS_TONE = {
  PENDING: "bg-amber-50 text-amber-800 border border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-800 border border-blue-200",
  SENT: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
};

const STATUS_ICON = { PENDING: Clock, PROCESSING: RefreshCw, SENT: ShieldCheck, FAILED: XCircle };

const FILTERS = [
  { value: "", labelAr: "الكل" },
  { value: "PENDING", labelAr: OUTBOX_STATUS_LABELS.PENDING },
  { value: "FAILED", labelAr: OUTBOX_STATUS_LABELS.FAILED },
  { value: "SENT", labelAr: OUTBOX_STATUS_LABELS.SENT },
];

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SY", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function EmailOutboxDashboard({ rows, tally, activeStatus, search, canManage }) {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState(search || "");

  function applyFilters(nextStatus, nextSearch) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (nextSearch) params.set("search", nextSearch);
    router.push(`/admin/emails${params.toString() ? `?${params}` : ""}`);
  }

  async function post(body, pendingKey, describe) {
    setBusy(pendingKey);
    setNotice("");
    try {
      const response = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
      setNotice(describe(data));
      router.refresh();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(null);
    }
  }

  const retry = (id) =>
    post({ action: "retry", id }, id, (data) =>
      data.row?.status === "SENT" ? "تم إرسال الرسالة." : `تعذر الإرسال: ${data.row?.lastError || "سبب غير معروف"}`,
    );

  const runWorker = () =>
    post({ action: "run" }, "run", (data) => {
      const { claimed = 0, sent = 0, failed = 0, retried = 0 } = data.result || {};
      if (!claimed) return "لا توجد رسائل بانتظار الإرسال.";
      return `عولجت ${claimed} رسالة — أُرسلت ${sent}، ستُعاد المحاولة لـ ${retried}، فشلت نهائياً ${failed}.`;
    });

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-4">
        {["PENDING", "FAILED", "SENT", "PROCESSING"].map((key) => {
          const Icon = STATUS_ICON[key];
          return (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#A48E68]">
                <Icon size={16} />
                <p className="text-xs font-bold text-slate-500">{OUTBOX_STATUS_LABELS[key]}</p>
              </div>
              <p className="mt-2 text-2xl font-black text-[#054239]">{(tally[key] ?? 0).toLocaleString("en-GB")}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              onClick={() => applyFilters(filter.value, query)}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold transition ${
                activeStatus === filter.value
                  ? "bg-[#003D33] text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter.labelAr}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); applyFilters(activeStatus, query.trim()); }}
          className="relative min-w-[220px] flex-1"
        >
          <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث ببريد المستلم"
            className="min-h-11 w-full rounded-xl border border-slate-200 pr-10 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]"
          />
        </form>

        {canManage && (
          <button
            onClick={runWorker}
            disabled={busy === "run"}
            title="يعالج دفعة من الرسائل المنتظرة فوراً بدل انتظار المهمة المجدولة"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003D33] px-4 text-sm font-black text-white disabled:opacity-50"
          >
            <Play size={16} />
            {busy === "run" ? "جارٍ المعالجة…" : "شغّل المعالج الآن"}
          </button>
        )}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm font-bold text-[#054239]">{notice}</p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
            <tr>
              <th className="p-4 font-bold">النوع</th>
              <th className="p-4 font-bold">المستلم</th>
              <th className="p-4 font-bold">الحالة</th>
              <th className="p-4 font-bold">المحاولات</th>
              <th className="p-4 font-bold">آخر تحديث</th>
              <th className="p-4 font-bold">السبب عند الفشل</th>
              {canManage && <th className="p-4 font-bold">إجراء</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="p-4">
                  <p className="font-bold text-slate-800">{row.label}</p>
                  {row.contextAr && <p className="mt-0.5 text-xs text-slate-400">{row.contextAr}</p>}
                </td>
                <td className="p-4"><bdi dir="ltr" className="text-slate-700">{row.recipient}</bdi></td>
                <td className="p-4">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[row.status]}`}>
                    {OUTBOX_STATUS_LABELS[row.status] || row.status}
                  </span>
                </td>
                <td className="p-4"><bdi dir="ltr" className="font-mono text-slate-600">{row.attempts}/{row.maxAttempts}</bdi></td>
                <td className="p-4 text-xs text-slate-500">
                  <p>{formatDateTime(row.updatedAt)}</p>
                  <p className="mt-0.5 text-slate-400">أنشئت {formatDateTime(row.createdAt)}</p>
                </td>
                <td className="p-4 max-w-[280px] text-xs text-red-700">{row.lastError || ""}</td>
                {canManage && (
                  <td className="p-4">
                    {row.status === "SENT" || row.status === "PROCESSING" ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <button
                        onClick={() => retry(row.id)}
                        disabled={busy === row.id}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-[#003D33] hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Send size={15} />
                        {busy === row.id ? "…" : "أرسل الآن"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="p-10 text-center text-slate-500">
                  لا توجد رسائل مطابقة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-400">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        «أرسل الآن» يصفّر عدّاد المحاولات ثم يحاول الإرسال فوراً. تُعرض آخر ١٠٠ رسالة حسب الفلتر.
      </p>
    </div>
  );
}
