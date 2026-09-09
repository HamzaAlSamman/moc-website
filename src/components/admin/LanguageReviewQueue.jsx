"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

// The reviewer's queue: upcoming events nobody has proofread yet, shown one at
// a time so signing off feels like flipping through a stack rather than
// scanning a table. Ticking one drops it from the stack immediately; the
// server refresh that follows just confirms the same state.
export default function LanguageReviewQueue({ events }) {
  const router = useRouter();
  const [localEvents, setLocalEvents] = useState(events);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");

  // The dashboard re-fetches after a sign-off (and on any other refresh); resync
  // to that server truth, only reclamping the position if it now overshoots.
  useEffect(() => {
    setLocalEvents(events);
    setIndex((i) => Math.min(i, Math.max(events.length - 1, 0)));
  }, [events]);

  const total = localEvents.length;
  const current = localEvents[index];

  function step(delta) {
    setIndex((i) => Math.min(Math.max(i + delta, 0), total - 1));
    setNotice("");
  }

  async function markReviewed(event) {
    setBusy(event.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/events/${event.id}/language-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر اعتماد التدقيق");
      setNotice(`تم اعتماد التدقيق اللغوي: ${event.titleAr}`);
      setLocalEvents((prev) => {
        const next = prev.filter((e) => e.id !== event.id);
        setIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
        return next;
      });
      router.refresh();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-bold text-gray-800">فعاليات قادمة بانتظار التدقيق اللغوي</h2>
        <a href="/admin/language-review" className="text-sm text-[#A48E68] hover:underline">فتح صفحة التدقيق</a>
      </div>
      <p className="mb-4 text-xs text-gray-400">
        الأقرب موعداً أولاً. بعد مراجعة النص الإنجليزي ضع إشارة الصح — وإذا عُدِّل الإنجليزي لاحقاً تُلغى الإشارة تلقائياً وتعود الفعالية هنا.
      </p>

      <p aria-live="polite" className="min-h-5 pb-2 text-sm font-bold text-[#054239]">{notice}</p>

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          لا توجد فعاليات قادمة بانتظار التدقيق. 🎉
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={index === 0}
              aria-label="الفعالية السابقة"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>

            <span className="text-xs font-bold text-gray-400">
              <bdi dir="ltr">{index + 1} / {total}</bdi>
            </span>

            <button
              type="button"
              onClick={() => step(1)}
              disabled={index === total - 1}
              aria-label="الفعالية التالية"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-5">
            <a
              href={`/admin/events/${current.id}`}
              className="inline-flex items-center gap-1.5 text-lg font-bold text-gray-800 hover:text-[#A48E68]"
            >
              {current.titleAr}
              <ExternalLink size={14} className="shrink-0 text-gray-300" />
            </a>
            <p className="mt-1 text-xs text-gray-400">
              <bdi dir="ltr">{new Date(current.startDate).toLocaleDateString("en-GB")}</bdi>
            </p>

            {current.missing.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {current.missing.map((field) => (
                  <span key={field} className="rounded-full bg-[#A48E68]/10 px-2.5 py-1 text-[11px] font-bold text-[#8B7654]">
                    ناقص: {field}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4">
              {/* An untranslated event cannot be signed off — the server
                  refuses it too, so the button is not offered here. */}
              {current.missing.length ? (
                <a
                  href={`/admin/events/${current.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#A48E68]/40 px-4 text-sm font-bold text-[#8B7654] hover:bg-[#A48E68]/5"
                >
                  أكمل الترجمة
                </a>
              ) : (
                <button
                  onClick={() => markReviewed(current)}
                  disabled={busy === current.id}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Check size={16} />
                  {busy === current.id ? "…" : "تم التدقيق"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
