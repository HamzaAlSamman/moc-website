"use client";

import { AlertTriangle, BookOpen, CheckCircle2, XCircle } from "lucide-react";

export default function EligibilityStep({
  requirements,
  answers,
  onAnswer,
  sources,
  isRtl,
  disabled,
  canEditRequirement = () => true,
}) {
  if (!requirements.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-qomra text-lg font-black">{isRtl ? "لا توجد أسئلة أهلية إضافية" : "No additional eligibility questions"}</h3>
            <p className="mt-1 text-sm">{isRtl ? "يمكنكم متابعة استكمال بيانات الطلب." : "You can continue completing the application."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{isRtl ? "أسئلة الأهلية" : "Eligibility questions"}</legend>
      {requirements.map((requirement) => {
        const answer = answers?.[requirement.key];
        const source = requirement.source?.document ? sources[requirement.source.document] : null;
        const itemDisabled = disabled || !canEditRequirement(requirement.key);
        return (
          <section key={requirement.key} className={`rounded-2xl border p-5 ${answer === false ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}>
            <h3 className="text-sm font-black leading-7 text-slate-800">
              {isRtl ? requirement.label.ar : requirement.label.en}
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
              <button
                type="button"
                onClick={() => onAnswer(requirement.key, true)}
                aria-pressed={answer === true}
                disabled={itemDisabled}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 ${answer === true ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                <CheckCircle2 className="h-4 w-4" />{isRtl ? "نعم" : "Yes"}
              </button>
              <button
                type="button"
                onClick={() => onAnswer(requirement.key, false)}
                aria-pressed={answer === false}
                disabled={itemDisabled}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 ${answer === false ? "border-rose-700 bg-rose-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}
              >
                <XCircle className="h-4 w-4" />{isRtl ? "لا" : "No"}
              </button>
            </div>
            {answer === false && requirement.blocking ? (
              <p role="alert" className="mt-3 flex items-start gap-2 text-xs font-bold leading-6 text-rose-800">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                {isRtl ? "يعد هذا الشرط إلزامياً للاستمرار في تقديم طلب الترخيص." : "This is a blocking condition. The application cannot continue until it is met."}
              </p>
            ) : null}
            <details className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-xs font-bold text-[#054239]">
                {isRtl ? "الأساس القانوني والتشريعي لهذا الشرط" : "Why is this required?"}
              </summary>
              <p className="mt-2 text-xs leading-6 text-slate-600">{isRtl ? requirement.help.ar : requirement.help.en}</p>
              {source ? (
                <a className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#054239] underline decoration-[#b9a779] underline-offset-4" href={source.publicUrl} target="_blank" rel="noreferrer">
                  <BookOpen className="h-4 w-4" />
                  {isRtl ? source.label.ar : source.label.en}
                  {requirement.source.article ? ` · ${requirement.source.article}` : ""}
                </a>
              ) : null}
            </details>
          </section>
        );
      })}
    </fieldset>
  );
}
