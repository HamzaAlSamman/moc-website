"use client";

import { useRouter } from "next/navigation";

/**
 * Screen-only toolbar above a printable sheet. Hidden in the printed output by
 * the `no-print` class in PrintStyles.
 */
export default function PrintToolbar({ title, backHref }) {
  const router = useRouter();

  return (
    <div className="no-print sticky top-0 z-10 mb-6 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-400">معاينة الطباعة</p>
          <h1 className="truncate text-sm font-black text-[#003D33]">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            رجوع
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-[#003D33] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#002B24]"
          >
            طباعة / حفظ PDF
          </button>
        </div>
      </div>
      <p className="mx-auto max-w-[210mm] px-4 pb-3 text-[11px] leading-relaxed text-slate-400">
        لحفظ الملف بصيغة PDF اختر «الوجهة / Destination» ثم «حفظ بصيغة PDF»، وفعّل خيار
        «رسومات الخلفية / Background graphics» ليظهر الترويسة بالألوان الرسمية.
      </p>
    </div>
  );
}
