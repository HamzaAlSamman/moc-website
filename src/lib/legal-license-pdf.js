import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import { LEGAL_LICENSE_TYPES, LEGAL_LICENSE_DOCUMENT_RULES } from "./legal-license.mjs";
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

export function escapeLegalLicenseHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function field(labelAr, labelEn, value) {
  return `<div class="field"><dt>${labelAr}<small>${labelEn}</small></dt><dd>${escapeLegalLicenseHtml(value || "\u2014")}</dd></div>`;
}

export function buildLegalLicenseHtml(application, qrSection = "") {
  const type = LEGAL_LICENSE_TYPES[application.licenseType];
  const a = assets();
  const founders = (application.founders || []).map((founder, index) => `
    <section class="item">
      <h3 style="font-size: 13px; color: #054239; margin-bottom: 8px;">
        ${index + 1}. ${escapeLegalLicenseHtml(founder.fullName)}
        ${founder.isAuthorizedRepresentative ? '<span class="badge">المفوض بالتوقيع (Representative)</span>' : ""}
      </h3>
      <div class="grid">
        ${field("الرقم الوطني", "National ID", founder.nationalId)}
        ${field("الهاتف", "Phone", ltrIsolate(founder.phone))}
        ${field("البريد", "Email", founder.email)}
        ${field("العنوان", "Address", founder.address)}
      </div>
    </section>`).join("");

  const signature = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(application.applicantSignature || "")
    ? application.applicantSignature
    : "";

  const attachments = (application.attachments || []).map((attachment) => {
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
@page { size: A4; margin: 13mm; }
*{box-sizing:border-box}
body{font-family:'Qomra',Arial,sans-serif;color:#1e293b;font-size:12px;margin:0;background:#fff}
.header{border-radius:12px;background:#054239;color:#fff;border-bottom:4px solid #b9a779;padding:20px 24px;display:flex;align-items:center;gap:20px}
.header img{width:64px;height:64px;object-fit:contain;background:#fff;border-radius:10px;padding:5px}
.header h1{font-size:22px;margin:0;font-weight:700}
.header p{color:#b9a779;margin:6px 0 0;font-size:11px}
.ref{margin-inline-start:auto;text-align:left}
.ref span{display:block;font-size:10px;color:#d1fae5;opacity:0.85}
.ref strong{display:block;color:#b9a779;font-size:18px;direction:ltr;font-family:Arial,sans-serif}
.section{margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;break-inside:avoid;box-shadow:0 1px 3px rgba(0,0,0,0.02);background:#fff}
.section>h2{margin:0;background:#f8fafc;color:#054239;border-bottom:1px solid #e2e8f0;border-right:5px solid #b9a779;padding:10px 15px;font-size:13px;font-weight:bold}
.grid{display:grid;grid-template-columns:1fr 1fr}
.field{display:flex;flex-direction:row;border-bottom:1px solid #f1f5f9;min-height:44px;align-items:center}
.field dt,.field dd{margin:0;padding:10px 12px}
.field dt{width:40%;font-weight:700;background:#f8fafc;color:#475569;align-self:stretch;display:flex;flex-direction:column;justify-content:center;border-left:1px solid #f1f5f9}
.field dt small{display:block;color:#94a3b8;font-weight:400;font-size:9px;margin-top:2px;direction:ltr;text-align:right}
.field dd{width:60%;color:#0f172a;font-weight:bold;white-space:normal;overflow-wrap:anywhere}
.wide{grid-column:1/-1}
.item{padding:12px 15px;border-bottom:1px dashed #e2e8f0;break-inside:avoid}
.item:last-child{border-bottom:none}
.badge{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:3px 10px;font-size:9px;font-weight:bold;margin-inline-start:8px;display:inline-block;vertical-align:middle}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ded8c9;padding:10px;text-align:right}
th{background:#f8fafc;color:#054239;font-weight:bold}
.signature{display:block;max-width:220px;max-height:90px;margin:12px auto;border-bottom:1px solid #7b705d}
.notice{margin-top:14px;background:#fff8e6;border:1px solid #ead69d;padding:10px;border-radius:9px;color:#604d19}
.footer{margin-top:25px;padding-top:15px;border-top:1px solid #e2e8f0;color:#64748b;text-align:center;font-size:10px}
</style></head><body>
<header class="header">${a.logo ? `<img src="${a.logo}" alt="Ministry logo">` : ""}<div><h1>طلب ترخيص قانوني</h1><p>Legal License Application — Syrian Ministry of Culture</p></div><div class="ref"><span>رقم المعاملة / Reference</span><strong>${escapeLegalLicenseHtml(application.referenceNo || application.id)}</strong><span>مراجعة / Revision ${escapeLegalLicenseHtml(application.revision || 1)}</span></div></header>
<section class="section"><h2>نوع الترخيص / License type</h2><div class="grid">${field("النوع", "Type", type ? `${type.label.ar} / ${type.label.en}` : application.licenseType)}</div></section>
<section class="section"><h2>بيانات مقدم الطلب / Applicant</h2><div class="grid">
${field("الاسم", "Name", application.applicantName)}${field("الرقم الوطني", "National ID", application.nationalId)}
${field("الهاتف", "Phone", ltrIsolate(application.phone))}${field("البريد", "Email", application.email)}${field("الصفة", "Capacity", application.capacity)}</div></section>
<section class="section"><h2>بيانات الجهة / Entity</h2><div class="grid">
${field("الاسم", "Name", application.entityName)}${field("المحافظة", "Governorate", application.governorate)}
${field("العنوان", "Address", application.address)}${field("الغاية", "Purpose", application.purpose)}
${field("الأهداف", "Objectives", application.objectives)}${field("النشاط", "Activity", application.activityDescription)}</div></section>
<section class="section"><h2>المؤسسون / Founders</h2>${founders || '<div class="item">—</div>'}</section>
<section class="section"><h2>الوثائق المرفقة / Attachments</h2>
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
  <h2>الإقرار والتوقيع / Declaration and signature</h2>
  ${signature ? `<img class="signature" src="${signature}" alt="Visual signature">` : "—"}
</section>
<div class="notice"><strong>Visual declaration only:</strong> the signature drawn in this service records the applicant declaration. It is not a qualified electronic signature.</div>

<footer class="footer">الجمهورية العربية السورية — وزارة الثقافة — بوابة التراخيص والاعتمادات الثقافية الإلكترونية</footer>
</body></html>`;
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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    await page.evaluate(() => document.fonts?.ready);
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
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
