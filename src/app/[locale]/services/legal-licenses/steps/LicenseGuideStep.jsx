"use client";

import { Check, Clock3, Download, LockKeyhole } from "lucide-react";
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
                {isRtl ? `عدد الوثائق المطلوبة: ${estimatedEvidenceCount}` : `Required documents: ${estimatedEvidenceCount}`}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${profile.gated
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"}`}>
                {profile.gated ? <LockKeyhole className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {profile.gated
                  ? (isRtl ? "الخدمة قيد التفعيل التجريبي" : "Service under pilot phase")
                  : (isRtl ? "المستندات التنظيمية متاحة" : "Regulatory documents available")}
              </span>
            </div>
            {profile.gated ? (
              <p className="mt-3 text-xs leading-6 text-amber-800">
                {isRtl
                  ? "تتوفر هذه الخدمة حالياً كنسخة تجريبية؛ وقد تخضع الشروط والوثائق المطلوبة للتحديث تماشياً مع القرارات والتعليمات التنظيمية الصادرة لاحقاً."
                  : "This service is currently available as a pilot version. Required conditions and documents are subject to update in accordance with subsequent regulatory decisions."}
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
                {isRtl ? "لا تتوفر مستندات مرجعية رسمية مرفقة لهذا النوع حالياً." : "No official source document is attached to this type yet."}
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
