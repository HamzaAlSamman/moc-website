"use client";

import { Check, Clock3, Download, FileCheck2, LockKeyhole } from "lucide-react";
import { LEGAL_LICENSE_TYPES } from "@/lib/legal-license.mjs";

export default function LicenseGuideStep({
  form,
  update,
  profile,
  sourceDocuments,
  isRtl,
  disabled,
  estimatedEvidenceCount,
}) {
  const types = Object.values(LEGAL_LICENSE_TYPES);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#b9a779]/35 bg-[#b9a779]/10 p-4 text-sm leading-7 text-[#054239]">
        <div className="flex items-start gap-3">
          <FileCheck2 className="mt-1 h-5 w-5 shrink-0" />
          <p>{isRtl
            ? "اختر نوع الترخيص، وسيحوّل النظام الشروط القانونية إلى أسئلة وحقول واضحة. لن تحتاج إلى تنزيل ملف Word أو تنسيقه."
            : "Choose the license type and the service will turn its legal conditions into clear questions and fields. You do not need to edit a Word file."}</p>
        </div>
      </div>

      <fieldset disabled={disabled}>
        <legend className="mb-3 font-qomra text-lg font-black text-[#054239]">
          {isRtl ? "نوع الترخيص المطلوب" : "Requested license type"}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {types.map((item) => {
            const selected = form.licenseType === item.value;
            return (
              <button
                type="button"
                key={item.value}
                onClick={() => update("licenseType", item.value)}
                className={`rounded-2xl border p-4 text-start outline-none transition focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 motion-reduce:transition-none ${selected
                  ? "border-[#054239] bg-[#054239]/5 ring-2 ring-[#b9a779]"
                  : "border-slate-200 bg-white hover:border-[#b9a779]"}`}
                aria-pressed={selected}
              >
                <span className="font-qomra text-base font-black text-[#054239]">
                  {isRtl ? item.label.ar : item.label.en}
                </span>
                <span className="mt-1 block text-[11px] text-slate-500">
                  {item.additionalDocuments.length} {isRtl ? "وثائق خاصة بالنوع" : "type-specific documents"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {profile ? (
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[1fr_auto]">
          <div>
            <h3 className="font-qomra text-lg font-black text-[#054239]">
              {isRtl ? profile.label.ar : profile.label.en}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-slate-600">
                <Clock3 className="h-3.5 w-3.5" />
                {estimatedEvidenceCount} {isRtl ? "وثيقة متوقعة" : "estimated documents"}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${profile.gated
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"}`}>
                {profile.gated ? <LockKeyhole className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {profile.gated
                  ? (isRtl ? "بانتظار اعتماد التعليمات الرسمية" : "Pending official guidance approval")
                  : (isRtl ? "المصدر القانوني مرتبط بالخدمة" : "Legal source linked")}
              </span>
            </div>
            {profile.gated ? (
              <p className="mt-3 text-xs leading-6 text-amber-800">
                {isRtl
                  ? "هذه الخدمة متاحة ضمن بوابة الاختبار الداخلية. سيظهر أي تحديث معتمد للشروط هنا دون أن يطلب منك إعادة تحرير مستند."
                  : "This service is available through the internal test gate. Approved requirement updates will appear here without asking you to edit a document."}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 md:min-w-56">
            {sourceDocuments.length ? sourceDocuments.map((source) => (
              <a
                key={source.key}
                href={source.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#054239] outline-none hover:border-[#b9a779] focus-visible:ring-4 focus-visible:ring-[#b9a779]/25"
              >
                <span>{isRtl ? source.label.ar : source.label.en}</span>
                <Download className="h-4 w-4 shrink-0" />
              </a>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs leading-6 text-slate-500">
                {isRtl ? "لا توجد وثيقة مرجعية رسمية مرفقة لهذا النوع بعد." : "No official source document is attached to this type yet."}
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
