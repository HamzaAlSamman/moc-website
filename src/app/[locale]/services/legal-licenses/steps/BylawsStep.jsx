"use client";

import { CheckCircle2, Download, FileText } from "lucide-react";
import { LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY } from "@/lib/legal-license-requirements.mjs";

export default function BylawsStep({
  profile,
  source,
  form,
  answer,
  onAnswer,
  isRtl,
  disabled,
  busyTemplate,
  mutationBusy,
  onDownloadTemplate,
}) {
  if (!profile?.generatesBylaws) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-qomra text-xl font-black">{isRtl ? "غير مطلوب لهذا النوع" : "Not required for this type"}</h3>
            <p className="mt-2 text-sm leading-7">{isRtl ? "لا يتطلب هذا النوع إرفاق نظام أساسي." : "This license type does not require articles of association."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#b9a779]/40 bg-[#b9a779]/10 p-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-6 w-6 shrink-0 text-[#054239]" />
          <div>
            <h3 className="font-qomra text-xl font-black text-[#054239]">{isRtl ? "النظام الأساسي المستكمل ببيانات الطلب (بما يتوافق مع النظام الداخلي الاسترشادي)" : "Articles completed from the application data (aligned with the model internal regulations)"}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {isRtl
                ? "نزّل ملف Word المستكمل تلقائياً ببيانات الطلب، وراجعه قبل متابعة الطلب."
                : "Download the Word file completed automatically from the application data and review it before continuing."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {source ? (
            <button type="button" onClick={onDownloadTemplate} disabled={busyTemplate || mutationBusy}
              className="inline-flex items-center gap-2 rounded-xl border border-[#054239] bg-white px-4 py-2.5 text-xs font-bold text-[#054239] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:cursor-not-allowed disabled:opacity-50">
              <Download className={`h-4 w-4 ${busyTemplate ? "animate-bounce" : ""}`} />
              {busyTemplate
                ? (isRtl ? "جاري تجهيز ملف Word…" : "Preparing Word file…")
                : (isRtl ? "تحميل النظام الأساسي المستكمل ببيانات الطلب" : "Download completed articles of association")}
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-qomra text-xl font-black text-[#054239]">
          {isRtl ? "البيانات التي ستُدمج في النظام الأساسي" : "Data to be included in the articles of association"}
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {isRtl
            ? "هذه القيم مقفلة هنا وتأتي من خطوات بيانات الطلب؛ البنود القانونية نفسها غير قابلة للتحرير."
            : "These locked values come from the application steps; the legal provisions themselves cannot be edited here."}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <LockedValue label={isRtl ? "اسم الجهة" : "Entity name"} value={form?.entityName} />
          <LockedValue label={isRtl ? "أهداف الجهة" : "Entity objectives"} value={form?.objectives} />
          <LockedValue className="sm:col-span-2" label={isRtl ? "المحافظة" : "Governorate"} value={form?.governorate} />
          <LockedValue label={isRtl ? "عنوان المقر" : "Premises address"} value={form?.address} />
          <LockedValue
            label={isRtl ? "بيانات مقدم الطلب والمؤسسون" : "Applicant and founders"}
            value={[
              `${isRtl ? "مقدم الطلب" : "Applicant"}: ${form?.applicantName || "—"}`,
              `${isRtl ? "المؤسسون" : "Founders"}: ${(form?.founders || []).map((founder) => founder.fullName).filter(Boolean).join("، ") || "—"}`,
            ].join("\n")}
          />
        </dl>
      </section>

      <label className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold leading-7 ${answer ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
        <input
          className="mt-1.5"
          type="checkbox"
          checked={answer === true}
          onChange={(event) => onAnswer(LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY, event.target.checked)}
          disabled={disabled}
        />
        {isRtl
          ? "أقر بأنني نزّلت النظام الأساسي المستكمل ببيانات الطلب بما يتوافق مع النظام الداخلي الاسترشادي، وراجعته قبل المتابعة."
          : "I confirm that I downloaded and reviewed the articles completed from the application data in line with the model internal regulations."}
      </label>
    </div>
  );
}

function LockedValue({ label, value, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-black leading-7 text-slate-800">{value || "—"}</dd>
    </div>
  );
}
