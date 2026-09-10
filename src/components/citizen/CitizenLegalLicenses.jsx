"use client";

import Link from "next/link";
import { Landmark, ScrollText } from "lucide-react";

const STATUS = {
  DRAFT: ["مسودة", "Draft", "bg-slate-100 text-slate-700 border-slate-200"],
  SUBMITTED: ["مقدَّم", "Submitted", "bg-blue-50 text-blue-800 border-blue-200"],
  UNDER_REVIEW: ["قيد المراجعة", "Under review", "bg-indigo-50 text-indigo-800 border-indigo-200"],
  COMMITTEE_REVIEW: ["قيد مراجعة اللجنة", "Committee review", "bg-indigo-50 text-indigo-800 border-indigo-200"],
  SUSPENDED: ["موقوف للنواقص", "Suspended — action needed", "bg-amber-50 text-amber-800 border-amber-200"],
  LEGAL_APPROVAL: ["قيد التدقيق القانوني", "Legal review", "bg-teal-50 text-teal-800 border-teal-200"],
  MINISTER_APPROVAL: ["بانتظار موافقة الوزير", "Pending minister approval", "bg-cyan-50 text-cyan-800 border-cyan-200"],
  APPROVED: ["مُعتمد", "Approved", "bg-emerald-50 text-emerald-800 border-emerald-200"],
  REJECTED: ["مرفوض", "Rejected", "bg-rose-50 text-rose-800 border-rose-200"],
  LICENSE_ISSUED: ["صدرت الرخصة", "License issued", "bg-emerald-50 text-emerald-800 border-emerald-200"],
  COMPLETED: ["منجز", "Completed", "bg-emerald-50 text-emerald-800 border-emerald-200"],
};

function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export default function CitizenLegalLicenses({ applications, locale = "ar" }) {
  const isAr = locale === "ar";

  if (!applications.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#A48E68]/40 bg-[#f8faf8] p-10 text-center">
        <ScrollText className="mx-auto text-[#A48E68]" />
        <h3 className="mt-4 font-black text-[#002723]">{isAr ? "لا توجد طلبات ترخيص بعد" : "No license applications yet"}</h3>
        <Link
          href={`/${locale}/services/legal-licenses`}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#003D33] px-5 font-bold text-white focus-visible:ring-2 focus-visible:ring-[#A48E68]"
        >
          {isAr ? "تقديم طلب جديد" : "Submit a new request"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => {
        const status = STATUS[app.status] || [app.status, app.status, "bg-slate-50 text-slate-700 border-slate-200"];
        return (
          <article key={app.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${status[2]}`}>{status[isAr ? 0 : 1]}</span>
                <h3 className="mt-3 text-lg font-black text-[#002723]">{app.entityName || (isAr ? "بلا اسم" : "Untitled")}</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">{formatDate(app.createdAt, locale)}</p>
                {app.referenceNo && (
                  <p className="mt-1 font-mono text-xs font-bold tracking-wider text-[#006455]" dir="ltr">{app.referenceNo}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:items-end sm:justify-center">
                <Link
                  href={`/${locale}/services/legal-licenses?ref=${encodeURIComponent(app.referenceNo || "")}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003D33] px-4 text-sm font-black text-white transition hover:bg-[#002b24] focus-visible:ring-2 focus-visible:ring-[#A48E68]"
                >
                  <Landmark size={16} />
                  {isAr ? "متابعة الطلب" : "Track application"}
                </Link>
                <p className="text-[11px] text-slate-450 max-w-[220px] text-end">
                  {isAr ? "تحتاج رمز الوصول المُرسل إليك بالبريد لعرض التفاصيل الكاملة" : "You'll need the access token emailed to you to view full details"}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
