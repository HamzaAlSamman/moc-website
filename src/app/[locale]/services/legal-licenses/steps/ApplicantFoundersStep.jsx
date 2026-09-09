"use client";

import { Plus, Trash2, UserRoundCheck } from "lucide-react";
import StepField from "./StepField";

const managerFields = [
  ["fullName", "اسم المدير", "Manager name", "text"],
  ["nationalId", "الرقم الوطني", "National ID", "text", "ltr"],
  ["phone", "رقم الهاتف", "Phone", "tel", "ltr"],
  ["email", "البريد الإلكتروني", "Email", "email", "ltr"],
  ["occupation", "المهنة", "Occupation", "text"],
  ["qualification", "المؤهل العلمي", "Qualification", "text"],
];

const founderFields = [
  ["fullName", "الاسم الكامل", "Full name"],
  ["nationalId", "الرقم الوطني", "National ID", "text", "ltr"],
  ["birthDate", "تاريخ الميلاد", "Birth date", "date"],
  ["occupation", "المهنة", "Occupation"],
  ["qualification", "المؤهل العلمي", "Qualification"],
  ["phone", "الهاتف", "Phone", "tel", "ltr"],
  ["email", "البريد الإلكتروني", "Email", "email", "ltr"],
  ["address", "العنوان", "Address"],
];

export default function ApplicantFoundersStep({
  form,
  update,
  addFounder,
  setFounder,
  removeFounder,
  isRtl,
  canEditField,
  canEditFounderCollection,
}) {
  const representativeCount = form.founders.filter((founder) => founder.isAuthorizedRepresentative).length;
  return (
    <div className="space-y-7">
      <section>
        <div className="mb-4">
          <h3 className="font-qomra text-lg font-black text-[#054239]">{isRtl ? "مقدم الطلب" : "Applicant"}</h3>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            {isRtl
              ? "يرجى إدخال بيانات مقدم الطلب وصفته القانونية، سواء كان شريكاً مؤسساً أو مديراً/مفوضاً بتقديم الطلب."
              : "Enter the applicant details and capacity, whether a founder or an appointed manager/representative."}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <StepField required label={isRtl ? "الاسم الكامل" : "Full name"} value={form.applicantName} onChange={(value) => update("applicantName", value)} disabled={!canEditField("applicantName")} />
          <StepField required label={isRtl ? "الرقم الوطني" : "National ID"} value={form.nationalId} onChange={(value) => update("nationalId", value)} dir="ltr" disabled={!canEditField("nationalId")} />
          <StepField required type="tel" label={isRtl ? "رقم الهاتف" : "Phone"} value={form.phone} onChange={(value) => update("phone", value)} dir="ltr" disabled={!canEditField("phone")} />
          <StepField required type="email" label={isRtl ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={(value) => update("email", value)} dir="ltr" disabled={!canEditField("email")} />
          <StepField
            required
            label={isRtl ? "صفة مقدم الطلب أو المفوض بالتقديم" : "Applicant or appointed manager capacity"}
            value={form.capacity}
            onChange={(value) => update("capacity", value)}
            disabled={!canEditField("capacity")}
            help={isRtl ? "مثال: مؤسس مفوض، مدير متعاقد، وكيل قانوني." : "Example: authorized founder, contracted manager, legal representative."}
          />
        </div>
      </section>

      <section className="border-t border-slate-100 pt-6">
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            className="mt-1"
            type="checkbox"
            checked={form.managerDetails?.enabled === true}
            disabled={!canEditField("managerDetails.enabled")}
            onChange={(event) => update("managerDetails", event.target.checked
              ? {
                  enabled: true,
                  fullName: "",
                  nationalId: "",
                  phone: "",
                  email: "",
                  occupation: "",
                  qualification: "",
                }
              : { enabled: false })}
          />
          <span>
            <span className="block font-qomra text-lg font-black text-[#054239]">
              {isRtl ? "تعيين مدير مسؤول مستقل عن مقدم الطلب (اختياري)" : "A different manager will be appointed (optional)"}
            </span>
            <span className="mt-1 block text-xs leading-6 text-slate-500">
              {isRtl
                ? "يفعّل هذا الخيار في حال كان المدير المسؤول شخصاً آخر غير مقدم الطلب."
                : "Enable this only when another person will manage the entity."}
            </span>
          </span>
        </label>
        {form.managerDetails?.enabled ? (
          <div className="mt-4 grid gap-4 rounded-2xl border border-[#b9a779]/35 bg-[#b9a779]/5 p-4 md:grid-cols-2">
            {managerFields.map(([key, ar, en, type, dir]) => (
              <StepField
                key={key}
                required={key === "fullName"}
                label={isRtl ? ar : en}
                type={type}
                dir={dir}
                value={form.managerDetails?.[key] || ""}
                onChange={(value) => update("managerDetails", {
                  ...form.managerDetails,
                  [key]: value,
                })}
                disabled={!canEditField("managerDetails." + key)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-qomra text-lg font-black text-[#054239]">{isRtl ? "المؤسسون" : "Founders"}</h3>
            <p className="mt-1 text-xs text-slate-500">{isRtl ? "يجب تحديد مفوض واحد فقط بالتوقيع." : "Exactly one founder must be the authorized signatory."}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${representativeCount === 1 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            <UserRoundCheck className="me-1 inline h-4 w-4" />
            {isRtl ? `المفوضون: ${representativeCount}` : `Authorized: ${representativeCount}`}
          </span>
        </div>

        <div className="space-y-4">
          {form.founders.map((founder, index) => (
            <article key={founder.id || index} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-bold text-[#054239]">{isRtl ? `المؤسس ${index + 1}` : `Founder ${index + 1}`}</h4>
                <button
                  type="button"
                  onClick={() => removeFounder(index)}
                  disabled={!canEditFounderCollection}
                  aria-label={isRtl ? `حذف المؤسس ${index + 1}` : `Remove founder ${index + 1}`}
                  className="rounded-lg p-2 text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {founderFields.map(([key, ar, en, type = "text", dir]) => (
                  <StepField
                    key={key}
                    label={isRtl ? ar : en}
                    type={type}
                    value={key === "birthDate" && founder[key] ? String(founder[key]).slice(0, 10) : founder[key]}
                    onChange={(value) => setFounder(index, key, value)}
                    dir={dir}
                    isRtl={isRtl}
                    disabled={!canEditField(key, founder.id)}
                    maxDate={key === "birthDate" ? new Date().toISOString().split("T")[0] : undefined}
                    showPresets={key !== "birthDate"}
                  />
                ))}
              </div>
              <label className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${founder.isAuthorizedRepresentative ? "border-[#b9a779] bg-[#b9a779]/10 text-[#054239]" : "border-slate-200 text-slate-700"}`}>
                <input
                  type="radio"
                  name="authorized-representative"
                  checked={Boolean(founder.isAuthorizedRepresentative)}
                  onChange={() => setFounder(index, "isAuthorizedRepresentative", true)}
                  disabled={!canEditField("isAuthorizedRepresentative", founder.id)}
                />
                {isRtl ? "المفوض الوحيد بالتوقيع" : "Sole authorized signatory"}
              </label>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={addFounder}
          disabled={!canEditFounderCollection}
          className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[#b9a779] px-4 py-3 text-sm font-bold text-[#054239] outline-none hover:bg-[#b9a779]/10 focus-visible:ring-4 focus-visible:ring-[#b9a779]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />{isRtl ? "إضافة مؤسس" : "Add founder"}
        </button>
        {representativeCount !== 1 ? (
          <p role="alert" className="mt-3 text-xs font-bold text-rose-700">
            {isRtl ? "اختر مفوضاً واحداً بالتوقيع قبل الإرسال." : "Select exactly one authorized signatory before submission."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
