import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import { LEGAL_LICENSE_TYPES, LEGAL_LICENSE_DOCUMENT_RULES } from "./legal-license.mjs";
import { LEGAL_LICENSE_SOURCE_DOCUMENTS, getLegalLicenseRequirementProfile } from "./legal-license-requirements.mjs";
import { currentLegalLicenseAttachments } from "./legal-license-pdf-package-core.mjs";
import { computeVerificationCode } from "./pdf-verification.mjs";
import { requireChromiumExecutable } from "./chromium-executable.mjs";
import { ltrIsolate } from "./bidi.mjs";

const PUBLIC_DIR = path.join(process.cwd(), "public");
let cachedAssets;

function dataUri(file, mime) {
  try {
    return `data:${mime};base64,${fs.readFileSync(path.join(PUBLIC_DIR, file)).toString("base64")}`;
  } catch {
    return "";
  }
}

function assets() {
  if (!cachedAssets) {
    cachedAssets = {
      regular: dataUri("fonts/itfQomraArabic-Regular.otf", "font/otf"),
      bold: dataUri("fonts/itfQomraArabic-Bold.otf", "font/otf"),
      logo: dataUri("logo.png", "image/png"),
    };
  }
  return cachedAssets;
}

function buildDocumentHeader(application, { statusDocument = false } = {}) {
  const a = assets();
  const title = statusDocument ? "حالة طلب الترخيص" : "طلب ترخيص قانوني";
  const subtitle = statusDocument
    ? "وزارة الثقافة - مديرية الشؤون القانونية"
    : "Legal License Application - Syrian Ministry of Culture";
  const reference = escapeLegalLicenseHtml(application.referenceNo || application.id);
  const revision = escapeLegalLicenseHtml(application.revision || 1);
  return `<div class="document-header" style="width:100%;margin:0 0 7mm;box-sizing:border-box;direction:rtl;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;break-inside:avoid;page-break-inside:avoid">
    <div style="height:28mm;border-radius:10px;background:#054239;color:#fff;border-bottom:4px solid #b9a779;padding:8px 14px;display:flex;align-items:center;gap:14px;box-sizing:border-box">
      ${a.logo ? `<img src="${a.logo}" alt="Ministry logo" style="width:17mm;height:17mm;object-fit:contain;background:#fff;border-radius:8px;padding:4px">` : ""}
      <div><div style="font-size:20px;font-weight:700">${title}</div><div style="color:#d6c58e;margin-top:4px;font-size:10px">${subtitle}</div></div>
      <div style="margin-right:auto;text-align:left;direction:ltr"><span style="display:block;font-size:9px;color:#d1fae5">رقم المعاملة / Reference</span><strong style="display:block;color:#d6c58e;font-size:17px">${reference}</strong>${statusDocument ? "" : `<span style="display:block;font-size:9px;color:#d1fae5">مراجعة / Revision ${revision}</span>`}</div>
    </div>
  </div>`;
}

export function escapeLegalLicenseHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function field(labelAr, labelEn, value) {
  return `<div class="field"><dt>${labelAr}<small>${labelEn}</small></dt><dd>${escapeLegalLicenseHtml(value || "—")}</dd></div>`;
}

function visualSignature(value) {
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value || "") ? value : "";
}

function dateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

export function buildLegalLicenseHtml(application, qrSection = "") {
  const type = LEGAL_LICENSE_TYPES[application.licenseType];
  const profile = getLegalLicenseRequirementProfile(application.licenseType);
  const a = assets();
  const founders = (application.founders || []).map((founder, index) => `
    <section class="item">
      <h3 style="font-size: 13px; color: #054239; margin-bottom: 8px;">
        ${index + 1}. ${escapeLegalLicenseHtml(founder.fullName)}
        ${founder.isAuthorizedRepresentative ? '<span class="badge">المفوض بالتوقيع (Representative)</span>' : ""}
      </h3>
      <div class="grid">
        ${field("الرقم الوطني", "National ID", founder.nationalId)}
        ${field("تاريخ الميلاد", "Birth date", dateOnly(founder.birthDate))}
        ${field("الجنسية", "Nationality", founder.nationality)}
        ${field("المهنة", "Occupation", founder.occupation)}
        ${field("المؤهل العلمي", "Qualification", founder.qualification)}
        ${field("الهاتف", "Phone", ltrIsolate(founder.phone))}
        ${field("البريد", "Email", founder.email)}
        ${field("العنوان", "Address", founder.address)}
      </div>
    </section>`).join("");

  const signatureCards = [
    {
      role: "مقدم الطلب / Applicant",
      name: application.applicantName,
      image: visualSignature(application.applicantSignature),
    },
    ...(application.founders || []).map((founder) => ({
      role: "مؤسس / Founder",
      name: founder.fullName,
      image: visualSignature(founder.visualSignature),
    })),
  ].map((item) => `<div class="signature-card">
    <h3>${escapeLegalLicenseHtml(item.role)}</h3>
    <strong>${escapeLegalLicenseHtml(item.name || "—")}</strong>
    ${item.image ? `<img class="signature" src="${item.image}" alt="Visual signature">` : '<span class="missing-signature">—</span>'}
  </div>`).join("");

  const declarations = [
    {
      label: "أقر بصحة جميع البيانات والوثائق المقدمة.",
      labelEn: "I confirm that all submitted information and documents are accurate.",
      accepted: application.declarationAccuracy === true,
    },
    {
      label: "أتحمل المسؤولية القانونية عن صحة هذا الطلب.",
      labelEn: "I accept legal responsibility for the accuracy of this application.",
      accepted: application.declarationResponsibility === true,
    },
    {
      label: "أوافق على معالجة البيانات لأغراض هذه المعاملة.",
      labelEn: "I consent to processing the data for this application.",
      accepted: application.declarationPrivacy === true,
    },
    ...(profile?.postLicenseDeclarations || []).map((item) => ({
      label: item.label.ar,
      labelEn: item.label.en,
      help: item.help.ar,
      accepted: application.postLicenseDeclarations?.[item.key] === true,
    })),
  ].map((item) => `<div class="declaration ${item.accepted ? "accepted" : "pending"}">
    <span class="declaration-check">${item.accepted ? "✓" : "○"}</span>
    <span><strong>${escapeLegalLicenseHtml(item.label)}</strong>${item.help ? `<em>${escapeLegalLicenseHtml(item.help)}</em>` : ""}<small>${escapeLegalLicenseHtml(item.labelEn)}</small></span>
  </div>`).join("");

  const attachments = currentLegalLicenseAttachments(application.attachments).map((attachment) => {
    const label = LEGAL_LICENSE_DOCUMENT_RULES[attachment.kind]?.label?.ar || attachment.kind;
    const labelEn = LEGAL_LICENSE_DOCUMENT_RULES[attachment.kind]?.label?.en || "";
    return `
    <tr>
      <td style="font-weight: bold; color: #054239; padding: 10px; border: 1px solid #ded8c9; font-size: 11px;">
        ${escapeLegalLicenseHtml(label)}
        ${labelEn ? `<br><small style="color: #64748b; font-weight: normal; font-size: 9px; display: block; direction: ltr; text-align: right; margin-top: 2px;">${escapeLegalLicenseHtml(labelEn)}</small>` : ""}
        ${attachment.originalName ? `<br><small style="color: #64748b; font-weight: normal; font-size: 9px; display: block; direction: ltr; text-align: right; margin-top: 2px;">${escapeLegalLicenseHtml(attachment.originalName)}</small>` : ""}
      </td>
      <td style="color: #16a34a; font-weight: bold; text-align: center; padding: 10px; border: 1px solid #ded8c9; font-size: 11px; vertical-align: middle;">
        ✓ مرفق بنجاح (Attached)
      </td>
    </tr>`;
  }).join("");

  const sourceDocuments = (profile?.sourceDocuments || []).map((key) => LEGAL_LICENSE_SOURCE_DOCUMENTS[key])
    .filter((source) => source && source.kind !== "MODEL_BYLAWS")
    .map((source) => `<div class="source-document"><span>✓</span><strong>${escapeLegalLicenseHtml(source.label.ar)}</strong><small>${escapeLegalLicenseHtml(source.label.en)}</small></div>`)
    .join("");

  const issuedAt = new Date().toISOString();
  const docTitle = `طلب ترخيص قانوني — ${escapeLegalLicenseHtml(application.entityName || "")} — ${escapeLegalLicenseHtml(application.referenceNo || application.id)}`;
  const docKeywords = [
    application.referenceNo || application.id,
    application.licenseType,
    application.governorate,
    "وزارة الثقافة السورية",
    "Syrian Ministry of Culture",
    "Legal License",
    "ترخيص قانوني",
  ].filter(Boolean).join(", ");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${docTitle}</title>
<meta name="title" content="${docTitle}">
<meta name="author" content="${escapeLegalLicenseHtml(application.applicantName || "وزارة الثقافة السورية")}">
<meta name="subject" content="طلب ترخيص قانوني — بوابة التراخيص والاعتمادات الثقافية">
<meta name="description" content="وثيقة رسمية صادرة عن وزارة الثقافة في الجمهورية العربية السورية — مديرية الشؤون القانونية">
<meta name="keywords" content="${docKeywords}">
<meta name="creator" content="بوابة التراخيص والاعتمادات الثقافية الإلكترونية">
<meta name="producer" content="Syrian Ministry of Culture — Legal Affairs Directorate">
<meta name="rights" content="جميع الحقوق محفوظة — وزارة الثقافة في الجمهورية العربية السورية. لا يُسمح بإعادة إنتاج هذه الوثيقة أو تعديلها بدون إذن رسمي.">
<meta name="date" content="${issuedAt}">
<meta name="language" content="ar">
<meta name="document-id" content="${escapeLegalLicenseHtml(application.id)}">
<meta name="reference-no" content="${escapeLegalLicenseHtml(application.referenceNo || application.id)}">
<meta name="revision" content="${escapeLegalLicenseHtml(application.revision || 1)}">
<style>
${a.regular ? `@font-face{font-family:'Qomra';font-weight:400;font-style:normal;src:url('${a.regular}') format('opentype');}` : ""}
${a.bold ? `@font-face{font-family:'Qomra';font-weight:700;font-style:normal;src:url('${a.bold}') format('opentype');}` : ""}
@page { size: A4; }
*{box-sizing:border-box}
body{font-family:'Qomra',Arial,sans-serif;color:#1e293b;font-size:12px;margin:0;background:#fff}
.section{margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;break-inside:avoid-page;page-break-inside:avoid;box-shadow:0 1px 3px rgba(0,0,0,0.02);background:#fff}
.section.splittable{overflow:visible;break-inside:auto;page-break-inside:auto}
.section>h2{margin:0;background:#f8fafc;color:#054239;border-bottom:1px solid #e2e8f0;border-right:5px solid #b9a779;padding:10px 15px;font-size:13px;font-weight:bold}
.section.splittable>h2{break-after:avoid-page;page-break-after:avoid;border:1px solid #e2e8f0;border-radius:12px 12px 0 0}
.grid{display:grid;grid-template-columns:1fr 1fr}
.field{display:flex;flex-direction:row;border-bottom:1px solid #f1f5f9;min-height:44px;align-items:center}
.field dt,.field dd{margin:0;padding:10px 12px}
.field dt{width:40%;font-weight:700;background:#f8fafc;color:#475569;align-self:stretch;display:flex;flex-direction:column;justify-content:center;border-left:1px solid #f1f5f9}
.field dt small{display:block;color:#94a3b8;font-weight:400;font-size:9px;margin-top:2px;direction:ltr;text-align:right}
.field dd{width:60%;color:#0f172a;font-weight:bold;white-space:normal;overflow-wrap:anywhere}
.wide{grid-column:1/-1}
.item{padding:12px 15px;border-bottom:1px dashed #e2e8f0;break-inside:avoid-page;page-break-inside:avoid;background:#fff}
.item:last-child{border-bottom:none}
.badge{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:3px 10px;font-size:9px;font-weight:bold;margin-inline-start:8px;display:inline-block;vertical-align:middle}
table{width:100%;border-collapse:collapse}
thead{display:table-header-group}
tr{break-inside:avoid-page;page-break-inside:avoid}
th,td{border:1px solid #ded8c9;padding:10px;text-align:right}
th{background:#f8fafc;color:#054239;font-weight:bold}
.signature{display:block;max-width:220px;max-height:90px;margin:12px auto 0;border-bottom:1px solid #7b705d}
.declarations{padding:12px;display:grid;gap:8px}
.declaration{display:flex;align-items:flex-start;gap:9px;padding:9px 11px;border:1px solid #dbe5e3;border-radius:8px;background:#f8fafc;break-inside:avoid-page;page-break-inside:avoid}
.declaration.accepted{border-color:#86efac;background:#ecfdf5;color:#065f46}
.declaration.pending{border-color:#f3d6a2;background:#fff8e6;color:#7c5b18}
.declaration-check{font:700 15px Arial,sans-serif;line-height:1.2}
.declaration small{display:block;margin-top:3px;color:#64748b;font-size:9px;direction:ltr;text-align:right;font-weight:400}
.declaration em{display:block;margin-top:4px;color:#475569;font-size:9px;font-style:normal;font-weight:400;line-height:1.6}
.signature-block{margin:0 12px 12px;padding:10px;border-top:1px solid #e2e8f0}
.signature-list{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.signature-card{padding:10px;border:1px solid #ded8c9;border-radius:8px;text-align:center;break-inside:avoid-page;page-break-inside:avoid;background:#faf9f6}
.signature-card h3{margin:0;color:#054239;font-size:11px}
.signature-card strong{display:block;margin-top:4px;font-size:11px;color:#334155}
.missing-signature{display:block;margin:14px;color:#94a3b8}
.source-documents{padding:12px;display:grid;gap:8px}
.source-document{display:grid;grid-template-columns:auto 1fr;column-gap:8px;padding:9px 11px;border:1px solid #ded8c9;border-radius:8px;background:#faf9f6;color:#054239}
.source-document span{grid-row:1/3;color:#16a34a;font:bold 14px Arial}
.source-document small{display:block;color:#64748b;font-size:9px;direction:ltr;text-align:right;font-weight:400}
.notice{margin-top:14px;background:#fff8e6;border:1px solid #ead69d;padding:10px;border-radius:9px;color:#604d19}
</style></head><body>
${buildDocumentHeader(application)}
<section class="section"><h2>نوع الترخيص / License type</h2><div class="grid">${field("النوع", "Type", type ? `${type.label.ar} / ${type.label.en}` : application.licenseType)}</div></section>
<section class="section"><h2>بيانات مقدم الطلب / Applicant</h2><div class="grid">
${field("الاسم", "Name", application.applicantName)}${field("الرقم الوطني", "National ID", application.nationalId)}
${field("الهاتف", "Phone", ltrIsolate(application.phone))}${field("البريد", "Email", application.email)}${field("الصفة", "Capacity", application.capacity)}</div></section>
<section class="section"><h2>بيانات الجهة / Entity</h2><div class="grid">
${field("الاسم", "Name", application.entityName)}${field("المحافظة", "Governorate", application.governorate)}
${field("العنوان", "Address", application.address)}${field("الأهداف", "Objectives", application.objectives)}
${field("النشاط", "Activity", application.activityDescription)}</div></section>
<section class="section splittable"><h2>المؤسسون / Founders</h2>${founders || '<div class="item">—</div>'}</section>
${sourceDocuments ? `<section class="section"><h2>نظام وقرار الترخيص المرفق / Included licensing rules</h2><div class="source-documents">${sourceDocuments}</div></section>` : ""}
<section class="section splittable"><h2>الوثائق المرفقة / Attachments</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr>
        <th style="background: #f8fafc; border: 1px solid #ded8c9; padding: 10px; text-align: right; color: #054239; font-size: 11px; font-weight: bold; width: 65%;">نوع الوثيقة المرفقة / Document Type</th>
        <th style="background: #f8fafc; border: 1px solid #ded8c9; padding: 10px; text-align: center; color: #054239; font-size: 11px; font-weight: bold; width: 35%;">حالة الإرفاق / Status</th>
      </tr>
    </thead>
    <tbody>
      ${attachments || `<tr><td colspan="2" style="text-align: center; padding: 15px; color: #999; font-style: italic;">لا توجد مرفقات حتى الآن (No attachments yet)</td></tr>`}
    </tbody>
  </table>
</section>

${qrSection}
<section class="section">
  <h2>التعهدات والتوقيع / Declarations and signature</h2>
  <div class="declarations">${declarations}</div>
  <div class="signature-block">
    <div class="signature-list">${signatureCards}</div>
    <p style="margin:7px 0 0;color:#7c5b18;font-size:9px;line-height:1.5">التوقيع المرئي إقرار مرفق بالطلب وليس توقيعاً إلكترونياً مؤهلاً. Visual declaration only: this is not a qualified electronic signature.</p>
  </div>
</section>

</body></html>`;
}

const STATUS_LABELS = Object.freeze({
  DRAFT: "مسودة", SUBMITTED: "تم الإرسال", UNDER_REVIEW: "قيد التدقيق",
  COMMITTEE_REVIEW: "لدى اللجنة", SUSPENDED: "بانتظار استكمال النواقص",
  LEGAL_APPROVAL: "الاعتماد القانوني", MINISTER_APPROVAL: "اعتماد المفوض",
  APPROVED: "مقبول", REJECTED: "مرفوض", LICENSE_ISSUED: "صدر الترخيص", COMPLETED: "مكتمل",
});

export function buildLegalLicenseStatusHtml(application) {
  const a = assets();
  const notes = (application.history || [])
    .filter((entry) => entry.actorRole === "LICENSING_COMMITTEE" && entry.publicNote)
    .map((entry) => `<li><p>${escapeLegalLicenseHtml(entry.publicNote)}</p><time>${escapeLegalLicenseHtml(new Date(entry.createdAt).toLocaleDateString("ar-SY"))}</time></li>`)
    .join("");
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>حالة الطلب - ${escapeLegalLicenseHtml(application.referenceNo)}</title><style>
${a.regular ? `@font-face{font-family:'Qomra';font-weight:400;src:url('${a.regular}') format('opentype');}` : ""}
${a.bold ? `@font-face{font-family:'Qomra';font-weight:700;src:url('${a.bold}') format('opentype');}` : ""}
@page{size:A4}*{box-sizing:border-box}body{font-family:'Qomra',Arial,sans-serif;color:#1e293b;margin:0;font-size:13px}.card{border:1px solid #ded8c9;border-radius:14px;overflow:hidden;margin-bottom:18px;break-inside:avoid-page;page-break-inside:avoid}.card h2{margin:0;padding:11px 16px;background:#f8fafc;border-right:5px solid #b9a779;color:#054239;font-size:15px}.grid{display:grid;grid-template-columns:1fr 1fr}.field{padding:14px 16px;border-top:1px solid #eef2f7}.field span{display:block;color:#64748b;font-size:11px}.field strong{display:block;margin-top:5px;color:#054239;font-size:15px}.notes{margin:0;padding:15px 38px 18px}.notes li{margin:0 0 12px;break-inside:avoid-page;page-break-inside:avoid}.notes p{margin:0;white-space:pre-wrap}.notes time{color:#94a3b8;font-size:10px}.empty{padding:18px;color:#64748b}.footer{margin-top:22px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:10px}
</style></head><body>
${buildDocumentHeader(application, { statusDocument: true })}
<section class="card"><h2>بيانات الطلب</h2><div class="grid"><div class="field"><span>مقدم الطلب</span><strong>${escapeLegalLicenseHtml(application.applicantName || "-")}</strong></div><div class="field"><span>الجهة</span><strong>${escapeLegalLicenseHtml(application.entityName || "-")}</strong></div><div class="field"><span>الحالة الحالية</span><strong>${escapeLegalLicenseHtml(STATUS_LABELS[application.status] || application.status)}</strong></div><div class="field"><span>آخر تحديث</span><strong>${escapeLegalLicenseHtml(new Date(application.updatedAt).toLocaleDateString("ar-SY"))}</strong></div></div></section>
<section class="card"><h2>ملاحظات اللجنة الموجهة لمقدم الطلب</h2>${notes ? `<ol class="notes">${notes}</ol>` : '<p class="empty">لا توجد ملاحظات موجهة لمقدم الطلب حتى الآن.</p>'}</section>
<footer class="footer">هذه الوثيقة تعرض حالة الطلب والملاحظات العامة المسجلة في بوابة التراخيص الثقافية.</footer></body></html>`;
}

async function buildQrSection(application) {
  const ref = application.referenceNo || application.id;
  const revision = application.revision || 1;
  const code = computeVerificationCode(ref, application.id, revision);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://moc.gov.sy";
  const verifyUrl = `${baseUrl}/ar/services/legal-licenses/verify?ref=${encodeURIComponent(ref)}&code=${code}`;
  try {
    const qrDataUri = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 120,
      color: { dark: "#054239", light: "#ffffff" },
    });
    const codeFormatted = code.match(/.{1,4}/g).join("-");
    return `
<section class="section" style="break-inside:avoid;">
  <h2>التحقق من أصالة الوثيقة / Document Authenticity</h2>
  <div style="padding:16px;display:flex;align-items:center;gap:24px;background:#faf9f6;">
    <div style="flex-shrink:0;border:2px solid #b9a779;border-radius:10px;padding:6px;background:#fff;">
      <img src="${qrDataUri}" width="108" height="108" alt="QR" style="display:block;">
    </div>
    <div style="flex:1;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:#054239;">امسح رمز QR أو أدخل الكود أدناه للتحقق من أصالة هذه الوثيقة</p>
      <p style="margin:0 0 6px;font-size:10px;color:#64748b;">Scan QR or enter the code below to verify this document's authenticity</p>
      <div style="margin:10px 0;background:#054239;color:#b9a779;font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:6px;text-align:center;padding:10px 16px;border-radius:8px;direction:ltr;">${codeFormatted}</div>
      <p style="margin:0;font-size:9px;color:#94a3b8;direction:ltr;">${verifyUrl}</p>
    </div>
  </div>
</section>`;
  } catch {
    return "";
  }
}

let queue = Promise.resolve();

async function render(html) {
  const executablePath = requireChromiumExecutable();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      timeout: 60_000,
      args: [
        "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
        "--no-first-run", "--no-default-browser-check", "--disable-extensions",
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    await page.evaluate(() => document.fonts?.ready);
    return Buffer.from(await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "13mm", right: "13mm", bottom: "16mm", left: "13mm" },
    }));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export function generateLegalLicensePdf(application) {
  const task = queue.then(async () => {
    const qrSection = await buildQrSection(application);
    return render(buildLegalLicenseHtml(application, qrSection));
  });
  queue = task.then(() => {}, () => {});
  return task;
}

export function generateLegalLicenseStatusPdf(application) {
  const task = queue.then(() => render(buildLegalLicenseStatusHtml(application)));
  queue = task.then(() => {}, () => {});
  return task;
}

export function renderLegalLicenseHtmlPdf(html) {
  const task = queue.then(() => render(html));
  queue = task.then(() => {}, () => {});
  return task;
}
