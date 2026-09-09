"use client";

import { BookOpen } from "lucide-react";
import StepField from "./StepField";

const entityFields = [
  ["entityName", "اسم الجهة المقترح", "Proposed entity name", false],
  ["governorate", "المحافظة", "Governorate", false],
  ["address", "عنوان المقر", "Premises address", true],
  ["purpose", "الغاية", "Purpose", true],
  ["objectives", "الأهداف", "Objectives", true],
  ["activityDescription", "وصف النشاط", "Activity description", true],
];

function RequirementAnswer({ requirement, value, onChange, disabled, source, isRtl }) {
  if (requirement.answerType === "BOOLEAN") {
    return (
      <fieldset disabled={disabled} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-sm font-black leading-7 text-slate-800">{isRtl ? requirement.label.ar : requirement.label.en}</legend>
        <div className="mt-3 flex gap-3">
          {[true, false].map((answer) => (
            <button
              key={String(answer)}
              type="button"
              onClick={() => onChange(answer)}
              aria-pressed={value === answer}
              className={`min-w-24 rounded-xl border px-4 py-2.5 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 ${value === answer ? "border-[#054239] bg-[#054239] text-white" : "border-slate-200 bg-white text-slate-700"}`}
            >
              {answer ? (isRtl ? "نعم" : "Yes") : (isRtl ? "لا" : "No")}
            </button>
          ))}
        </div>
        <RequirementHelp requirement={requirement} source={source} isRtl={isRtl} />
      </fieldset>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <StepField
        label={isRtl ? requirement.label.ar : requirement.label.en}
        type={requirement.answerType === "NUMBER" ? "number" : "text"}
        value={value ?? ""}
        onChange={(next) => onChange(requirement.answerType === "NUMBER" && next !== "" ? Number(next) : next)}
        disabled={disabled}
      />
      <RequirementHelp requirement={requirement} source={source} isRtl={isRtl} />
    </div>
  );
}

function RequirementHelp({ requirement, source, isRtl }) {
  return (
    <details className="mt-3 text-xs leading-6 text-slate-600">
      <summary className="cursor-pointer font-bold text-[#054239]">{isRtl ? "الأساس القانوني والتشريعي لهذا الشرط" : "Why is this required?"}</summary>
      <p className="mt-1">{isRtl ? requirement.help.ar : requirement.help.en}</p>
      {source ? (
        <a href={source.publicUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-bold text-[#054239] underline decoration-[#b9a779] underline-offset-4">
          <BookOpen className="h-3.5 w-3.5" />
          {isRtl ? source.label.ar : source.label.en}{requirement.source.article ? ` · ${requirement.source.article}` : ""}
        </a>
      ) : null}
    </details>
  );
}

export default function EntityPremisesStep({
  form,
  update,
  requirements,
  onRequirementAnswer,
  sources,
  isRtl,
  canEditField,
  canEditRequirement,
}) {
  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-4 font-qomra text-lg font-black text-[#054239]">{isRtl ? "بيانات الجهة والمقر" : "Entity and premises"}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {entityFields.map(([key, ar, en, multiline]) => (
            <StepField
              key={key}
              required
              multiline={multiline}
              label={isRtl ? ar : en}
              value={form[key]}
              onChange={(value) => update(key, value)}
              disabled={!canEditField(key)}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-slate-100 pt-6">
        <h3 className="font-qomra text-lg font-black text-[#054239]">{isRtl ? "أسئلة المقر والتجهيزات" : "Premises and equipment questions"}</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          {requirements.length
            ? (isRtl ? "تستند هذه الأسئلة إلى الشروط والضوابط القانونية المعتمدة لكل ترخيص." : "These questions come from the selected license profile.")
            : (isRtl ? "لا تتوفر شروط أو متطلبات فنية إضافية خاصة بهذا الترخيص حالياً." : "There are no additional technical questions for this type yet.")}
        </p>
        <div className="mt-4 space-y-4">
          {requirements.map((requirement) => (
            <RequirementAnswer
              key={requirement.key}
              requirement={requirement}
              value={form.premisesAnswers?.[requirement.key]}
              onChange={(value) => onRequirementAnswer(requirement.key, value)}
              disabled={!canEditRequirement(requirement.key)}
              source={requirement.source?.document ? sources[requirement.source.document] : null}
              isRtl={isRtl}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
