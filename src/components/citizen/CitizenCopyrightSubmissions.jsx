"use client";

import Link from "next/link";
import { FileText, ScrollText } from "lucide-react";

const STATUS = {
  submitted: ["مقدم (بانتظار الرسم الأولي)", "Submitted (initial fee pending)", "bg-blue-50 text-blue-800 border-blue-200"],
  finance_review: ["قيد التدقيق المالي للرسم", "Finance reviewing fee", "bg-teal-50 text-teal-800 border-teal-200"],
  under_review: ["قيد الدراسة والتدقيق", "Under technical review", "bg-indigo-50 text-indigo-800 border-indigo-200"],
  suspended: ["موقوف مؤقتاً للنواقص", "Suspended — action needed", "bg-amber-50 text-amber-800 border-amber-200"],
  pending_final_approval: ["بانتظار الموافقة النهائية", "Pending final approval", "bg-cyan-50 text-cyan-800 border-cyan-200"],
  rejected: ["مرفوض", "Rejected", "bg-rose-50 text-rose-800 border-rose-200"],
  pending_fees: ["بانتظار استكمال الرسوم", "Pending final fee", "bg-orange-50 text-orange-800 border-orange-200"],
  final_review: ["قيد التدقيق المالي النهائي", "Final finance review", "bg-teal-50 text-teal-800 border-teal-200"],
  pending_center_delivery: ["بانتظار التسليم عبر المركز الثقافي", "Pending center delivery", "bg-purple-50 text-purple-800 border-purple-200"],
  pending_certificate: ["بانتظار رفع الشهادة وإرسالها", "Pending certificate issuance", "bg-sky-50 text-sky-800 border-sky-200"],
  completed: ["منجز", "Completed", "bg-emerald-50 text-emerald-800 border-emerald-200"],
};

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export default function CitizenCopyrightSubmissions({ submissions, locale = "ar" }) {
  const isAr = locale === "ar";

  if (!submissions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#A48E68]/40 bg-[#f8faf8] p-10 text-center">
        <ScrollText className="mx-auto text-[#A48E68]" />
        <h3 className="mt-4 font-black text-[#002723]">{isAr ? "لا توجد معاملات حقوق مؤلف بعد" : "No copyright submissions yet"}</h3>
        <Link
          href={`/${locale}/services/copyright`}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#003D33] px-5 font-bold text-white focus-visible:ring-2 focus-visible:ring-[#A48E68]"
        >
          {isAr ? "تقديم طلب جديد" : "Submit a new request"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((sub) => {
        const status = STATUS[sub.applicationStatus] || [sub.applicationStatus, sub.applicationStatus, "bg-slate-50 text-slate-700 border-slate-200"];
        return (
          <article key={sub.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status[2]}`}>{status[isAr ? 0 : 1]}</span>
                <h3 className="mt-3 text-lg font-black text-[#002723]">{sub.workTitle}</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">{formatDate(sub.createdAt, locale)}</p>
                {sub.referenceNo && (
                  <p className="mt-1 font-mono text-xs font-bold tracking-wider text-[#006455]" dir="ltr">{sub.referenceNo}</p>
                )}
              </div>
              <div className="flex shrink-0 items-end sm:items-center">
                <Link
                  href={`/${locale}/services/copyright?code=${encodeURIComponent(sub.id)}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003D33] px-4 text-sm font-black text-white transition hover:bg-[#002b24] focus-visible:ring-2 focus-visible:ring-[#A48E68]"
                >
                  <FileText size={16} />
                  {isAr ? "متابعة المعاملة" : "Track submission"}
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
