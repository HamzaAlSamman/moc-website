import "server-only";
import { sendMail, wrapMinistryEmail } from "@/lib/mailer";

const TITLES = {
  DRAFT_SAVED: ["\u062a\u0645 \u062d\u0641\u0638 \u0645\u0633\u0648\u062f\u0629 \u0637\u0644\u0628 \u0627\u0644\u062a\u0631\u062e\u064a\u0635", "Legal-license draft saved"],
  SUBMITTED: ["\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062a\u0631\u062e\u064a\u0635", "Legal-license application submitted"],
  SUSPENDED: ["\u064a\u0644\u0632\u0645 \u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0646\u0648\u0627\u0642\u0635 \u0637\u0644\u0628 \u0627\u0644\u062a\u0631\u062e\u064a\u0635", "Legal-license application needs updates"],
  APPROVED: ["\u062a\u0645\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u062a\u0631\u062e\u064a\u0635", "Legal-license application approved"],
  REJECTED: ["\u0642\u0631\u0627\u0631 \u0637\u0644\u0628 \u0627\u0644\u062a\u0631\u062e\u064a\u0635", "Legal-license application decision"],
  LICENSE_ISSUED: ["\u062a\u0645 \u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u062a\u0631\u062e\u064a\u0635", "Legal license issued"],
  COMPLETED: ["\u062a\u0645 \u0625\u0646\u062c\u0627\u0632 \u0645\u0639\u0627\u0645\u0644\u0629 \u0627\u0644\u062a\u0631\u062e\u064a\u0635", "Legal-license application completed"],
};

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendLegalLicenseCitizenEmail(application, event, { accessToken, note } = {}) {
  if (!application?.email || !application.email.includes("@")) return false;
  const [titleAr, titleEn] = TITLES[event] || TITLES.SUBMITTED;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/$/, "");
  const locale = "ar";
  const tracking = `${base}/${locale}/services/legal-licenses?track=${encodeURIComponent(application.referenceNo || "")}`;
  const resume = accessToken ? `${tracking}#token=${encodeURIComponent(accessToken)}` : tracking;
  const body = `
    <p>${escapeHtml(titleAr)}</p>
    <p dir="ltr">${escapeHtml(titleEn)}</p>
    <p><strong>Reference:</strong> <span dir="ltr">${escapeHtml(application.referenceNo)}</span></p>
    ${note ? `<p>${escapeHtml(note)}</p>` : ""}
    <p><a href="${escapeHtml(resume)}">${event === "DRAFT_SAVED" ? "Resume draft / \u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u0633\u0648\u062f\u0629" : "Track application / \u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0637\u0644\u0628"}</a></p>
  `;
  await sendMail({
    to: application.email,
    subject: `${titleAr} - ${application.referenceNo || ""}`,
    html: wrapMinistryEmail({ directorate: "Legal Affairs", titleAr, contentHtml: body }),
  });
  return true;
}
