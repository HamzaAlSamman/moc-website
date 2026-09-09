"use client";

import { CheckCircle2, Download, FileText } from "lucide-react";
import { LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY } from "@/lib/legal-license-requirements.mjs";

export default function BylawsStep({
  profile,
  form,
  source,
  answer,
  onAnswer,
  isRtl,
  disabled,
  onReturnToEntity,
}) {
  if (!profile?.generatesBylaws) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-qomra text-xl font-black">{isRtl ? "غير مطلوب لهذا النوع" : "Not required for this type"}</h3>
            <p className="mt-2 text-sm leading-7">{isRtl ? "تبقى هذه الخطوة ظاهرة لتوضيح اكتمال ملف المعاملة، لكنها منجزة تلقائياً." : "This step remains visible so the dossier is complete, but it is completed automatically."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#b9a779]/40 bg-[#b9a779]/10 p-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-6 w-6 shrink-0 text-[#054239]" />
          <div>
            <h3 className="font-qomra text-xl font-black text-[#054239]">{isRtl ? "مشروع النظام الأساسي" : "Draft bylaws"}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {isRtl
                ? "يتم توليد مشروع النظام الأساسي تلقائياً بناءً على بيانات الطلب المدخلة ووفقاً للنموذج الاسترشادي المعتمد. يمكنكم الاطلاع على النموذج المرجعي أدناه، وستتوفر نسخة المعاينة الخاصة بطلبكم بعد حفظ كافة الوثائق المطلوبة."
                : "The service will build a structured draft from your answers using the model bylaws. Review the source now; the generated preview will be available after documents are saved."}
            </p>
          </div>
        </div>
        {source ? (
          <a href={source.publicUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#054239] bg-white px-4 py-2.5 text-xs font-bold text-[#054239] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25">
            <Download className="h-4 w-4" />{isRtl ? source.label.ar : source.label.en}
          </a>
        ) : null}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-qomra text-lg font-black text-[#054239]">
          {isRtl ? "البيانات التي ستُدمج في النظام الأساسي" : "Data inserted into the bylaws"}
        </h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          {isRtl
            ? "هذه القيم مقفلة هنا وتأتي من خطوة بيانات الجهة؛ البنود القانونية نفسها غير قابلة للتحرير."
            : "These values are locked here and come from the entity step; legal clauses are not editable."}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {profile.bylawVariables.map((variable) => {
            const value = form?.[variable.key];
            return (
              <div key={variable.key} className="rounded-xl border border-slate-200 bg-white p-3">
                <dt className="text-[11px] font-bold text-slate-500">{isRtl ? variable.label.ar : variable.label.en}</dt>
                <dd className={"mt-1 text-sm font-bold " + (value ? "text-slate-800" : "text-amber-700")}>
                  {value || (isRtl ? "غير مكتمل" : "Missing")}
                </dd>
              </div>
            );
          })}
        </dl>
        {profile.bylawVariables.some((variable) => !String(form?.[variable.key] || "").trim()) ? (
          <button type="button" onClick={onReturnToEntity}
            className="mt-4 rounded-xl border border-[#054239] bg-white px-4 py-2.5 text-xs font-bold text-[#054239] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25">
            {isRtl ? "العودة لإكمال بيانات الجهة" : "Return to complete entity data"}
          </button>
        ) : null}
      </section>

      <label className={"flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold leading-7 " + (answer ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700")}>
        <input
          className="mt-1.5"
          type="checkbox"
          checked={answer === true}
          onChange={(event) => onAnswer(LEGAL_LICENSE_BYLAW_ACKNOWLEDGMENT_KEY, event.target.checked)}
          disabled={disabled}
        />
        {isRtl
          ? "أوافق على توليد مشروع النظام الأساسي من النموذج الاسترشادي المرفق ومراجعته قبل الإرسال."
          : "I agree to generate the draft bylaws from the attached model and review it before submission."}
      </label>
    </div>
  );
}
