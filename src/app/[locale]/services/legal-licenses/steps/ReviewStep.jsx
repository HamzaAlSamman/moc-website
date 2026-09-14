"use client";

import { Download, FileCode2, FileText, Loader2, ScrollText } from "lucide-react";
import { canDownloadLegalLicenseStatusReport } from "@/lib/legal-license.mjs";

const previewCards = [
  { key: "application", icon: FileText, ar: "نسخة الطلب", en: "Application copy" },
  { key: "bylaws", icon: FileCode2, ar: "النظام الأساسي المستكمل ببيانات الطلب (بما يتوافق مع النظام الداخلي الاسترشادي)", en: "Articles completed from the application data" },
  { key: "status", icon: ScrollText, ar: "حالة الطلب", en: "Application status" },
];

export default function ReviewStep({
  form,
  profile,
  application,
  isRtl,
  onPreviewApplication,
  onPreviewDossier,
  onDownloadStatus,
  busyPdf,
}) {
  const completedBylawsAvailable = Boolean(profile?.generatesBylaws && application);
  const visiblePreviewCards = previewCards.filter((card) => card.key !== "bylaws" || profile?.generatesBylaws);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-slate-50 p-5">
        <h3 className="font-qomra text-xl font-black text-[#054239]">{form.entityName || "—"}</h3>
        <p className="mt-1 text-sm text-slate-500">{profile ? (isRtl ? profile.label.ar : profile.label.en) : "—"}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <Summary label={isRtl ? "مقدم الطلب" : "Applicant"} value={form.applicantName} />
          <Summary label={isRtl ? "المحافظة" : "Governorate"} value={form.governorate} />
          <Summary label={isRtl ? "عدد المؤسسين" : "Founders"} value={form.founders.length} />
          <Summary label={isRtl ? "عدد المرفقات" : "Attachments"} value={application?.attachments?.length || 0} />
        </dl>
      </section>
      <section>
        <h3 className="font-qomra text-lg font-black text-[#054239]">{isRtl ? "معاينات ملف المعاملة" : "Dossier previews"}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {visiblePreviewCards.map((card) => {
            let active = false;
            let onClick = undefined;

            if (card.key === "application") {
              active = Boolean(application);
              onClick = onPreviewApplication;
            } else if (card.key === "bylaws") {
              active = completedBylawsAvailable;
              onClick = onPreviewDossier;
            } else if (card.key === "status") {
              active = canDownloadLegalLicenseStatusReport(application);
              onClick = onDownloadStatus;
            }

            const isPdfLoading = ["application", "bylaws"].includes(card.key) && busyPdf;
            const Icon = isPdfLoading ? Loader2 : card.icon;

            const content = (
              <span className="flex items-center gap-3">
                <span className="rounded-xl bg-[#054239]/10 p-2 text-[#054239]">
                  <Icon className={`h-5 w-5 ${isPdfLoading ? "animate-spin text-[#b9a779]" : ""}`} />
                </span>
                <span>
                  <span className="block text-sm font-bold">{isRtl ? card.ar : card.en}</span>
                  <span className="mt-1 block text-[11px]">
                    {isPdfLoading
                      ? (isRtl ? "جاري إنشاء ملف PDF وتنزيله..." : "Generating PDF and downloading...")
                      : active
                      ? card.key === "application"
                        ? (isRtl ? "نسخة الطلب الإلكتروني فقط دون المرفقات" : "Electronic application only, without attachments")
                        : card.key === "bylaws"
                          ? (isRtl
                            ? "يتضمن النظام الأساسي المستكمل ببيانات الطلب بما يتوافق مع النظام الداخلي الاسترشادي، وكافة الوثائق والمرفقات المرفوعة في خطوة الوثائق."
                            : "Includes the articles completed from the application data and every document uploaded in the documents step.")
                          : (isRtl ? "متاحة الآن بصيغة PDF للتحميل" : "Available now as PDF to download")
                      : card.key === "status"
                      ? (isRtl ? "سيتوفر بعد مراجعة ودراسة الطلب من قبل اللجنة" : "Available after the committee reviews and studies the application")
                      : (isRtl ? "ستتوفر بعد اختيار نوع الترخيص وحفظ البيانات" : "Available after license selection and save")}
                  </span>
                </span>
              </span>
            );

            const className = "flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-start outline-none transition duration-150 hover:shadow-sm enabled:hover:border-[#b9a779] enabled:focus-visible:ring-4 enabled:focus-visible:ring-[#b9a779]/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

            return (
              <button
                key={card.key}
                type="button"
                onClick={onClick}
                disabled={!active || isPdfLoading}
                className={className}
              >
                {content}
                {isPdfLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#b9a779]" />
                ) : (
                  <Download className="h-4 w-4 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }) {
  return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 font-bold text-slate-700">{value || "—"}</dd></div>;
}
