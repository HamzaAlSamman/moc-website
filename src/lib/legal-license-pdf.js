import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { LEGAL_LICENSE_TYPES } from "./legal-license.mjs";

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

export function buildLegalLicenseHtml(application) {
  const type = LEGAL_LICENSE_TYPES[application.licenseType];
  const a = assets();
  const founders = (application.founders || []).map((founder, index) => `
    <section class="item">
      <h3>${index + 1}. ${escapeLegalLicenseHtml(founder.fullName)} ${founder.isAuthorizedRepresentative ? '<span class="badge">Authorized representative</span>' : ""}</h3>
      <div class="grid">
        ${field("\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0648\u0637\u0646\u064a", "National ID", founder.nationalId)}
        ${field("\u0627\u0644\u0647\u0627\u062a\u0641", "Phone", founder.phone)}
        ${field("\u0627\u0644\u0628\u0631\u064a\u062f", "Email", founder.email)}
        ${field("\u0627\u0644\u0639\u0646\u0648\u0627\u0646", "Address", founder.address)}
      </div>
    </section>`).join("");
  const signature = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(application.applicantSignature || "")
    ? application.applicantSignature
    : "";
  const attachments = (application.attachments || []).map((attachment) => `
    <tr><td>${escapeLegalLicenseHtml(attachment.kind)}</td><td>${escapeLegalLicenseHtml(attachment.originalName)}</td><td>${escapeLegalLicenseHtml(attachment.version)}</td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
${a.regular ? `@font-face{font-family:Qomra;font-weight:400;src:url("${a.regular}")}` : ""}
${a.bold ? `@font-face{font-family:Qomra;font-weight:700;src:url("${a.bold}")}` : ""}
@page { size: A4; margin: 13mm; }
*{box-sizing:border-box}body{font-family:Qomra,Arial,sans-serif;color:#173832;font-size:12px;margin:0}
.header{border-radius:14px;background:#002723;color:#fff;border-bottom:5px solid #b9a779;padding:18px 22px;display:flex;align-items:center;gap:18px}
.header img{width:58px;height:58px;object-fit:contain;background:#fff;border-radius:9px;padding:4px}
.header h1{font-size:20px;margin:0}.header p{color:#d8cfb8;margin:5px 0 0}.ref{margin-inline-start:auto;text-align:left}
.ref strong{display:block;color:#b9a779;font-size:17px;direction:ltr}.section{margin-top:14px;border:1px solid #ded8c9;border-radius:11px;overflow:hidden;break-inside:avoid}
.section>h2{margin:0;background:#f3efe4;color:#054239;border-right:5px solid #b9a779;padding:9px 13px;font-size:15px}
.grid{display:grid;grid-template-columns:1fr 1fr}.field{display:grid;grid-template-columns:38% 62%;border-bottom:1px solid #eee;min-height:38px}
.field dt,.field dd{margin:0;padding:8px 10px}.field dt{font-weight:700;background:#faf9f5}.field dt small{display:block;color:#786f5d;font-weight:400;direction:ltr}
.field dd{white-space:normal;overflow-wrap:anywhere}.wide{grid-column:1/-1}.item{padding:11px 13px;border-bottom:1px dashed #d8d1c1;break-inside:avoid}.item h3{margin:0 0 7px}
.badge{background:#e7f4ef;color:#176052;border-radius:999px;padding:2px 7px;font-size:9px}table{width:100%;border-collapse:collapse}
th,td{border:1px solid #e7e2d8;padding:7px;text-align:right}th{background:#faf9f5}.notice{margin-top:14px;background:#fff8e6;border:1px solid #ead69d;padding:10px;border-radius:9px;color:#604d19}
.signature{display:block;max-width:220px;max-height:90px;margin:10px auto;border-bottom:1px solid #7b705d}.footer{margin-top:13px;padding-top:8px;border-top:1px solid #d9d1bd;color:#796f5b;text-align:center;font-size:9px}
</style></head><body>
<header class="header">${a.logo ? `<img src="${a.logo}" alt="Ministry logo">` : ""}<div><h1>\u0637\u0644\u0628 \u062a\u0631\u062e\u064a\u0635 \u0642\u0627\u0646\u0648\u0646\u064a</h1><p>Legal License Application \u2014 Syrian Ministry of Culture</p></div><div class="ref"><span>Reference</span><strong>${escapeLegalLicenseHtml(application.referenceNo || application.id)}</strong><span>Revision ${escapeLegalLicenseHtml(application.revision || 1)}</span></div></header>
<section class="section"><h2>\u0646\u0648\u0639 \u0627\u0644\u062a\u0631\u062e\u064a\u0635 / License type</h2><div class="grid">${field("\u0627\u0644\u0646\u0648\u0639", "Type", type ? `${type.label.ar} / ${type.label.en}` : application.licenseType)}</div></section>
<section class="section"><h2>\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0642\u062f\u0645 \u0627\u0644\u0637\u0644\u0628 / Applicant</h2><div class="grid">
${field("\u0627\u0644\u0627\u0633\u0645", "Name", application.applicantName)}${field("\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0648\u0637\u0646\u064a", "National ID", application.nationalId)}
${field("\u0627\u0644\u0647\u0627\u062a\u0641", "Phone", application.phone)}${field("\u0627\u0644\u0628\u0631\u064a\u062f", "Email", application.email)}${field("\u0627\u0644\u0635\u0641\u0629", "Capacity", application.capacity)}</div></section>
<section class="section"><h2>\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062c\u0647\u0629 / Entity</h2><div class="grid">
${field("\u0627\u0644\u0627\u0633\u0645", "Name", application.entityName)}${field("\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629", "Governorate", application.governorate)}
${field("\u0627\u0644\u0639\u0646\u0648\u0627\u0646", "Address", application.address)}${field("\u0627\u0644\u063a\u0627\u064a\u0629", "Purpose", application.purpose)}
${field("\u0627\u0644\u0623\u0647\u062f\u0627\u0641", "Objectives", application.objectives)}${field("\u0627\u0644\u0646\u0634\u0627\u0637", "Activity", application.activityDescription)}</div></section>
<section class="section"><h2>\u0627\u0644\u0645\u0624\u0633\u0633\u0648\u0646 / Founders</h2>${founders || '<div class="item">\u2014</div>'}</section>
<section class="section"><h2>\u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a / Attachments</h2><table><thead><tr><th>Kind</th><th>File</th><th>Version</th></tr></thead><tbody>${attachments || '<tr><td colspan="3">\u2014</td></tr>'}</tbody></table></section>
<section class="section"><h2>\u0627\u0644\u0625\u0642\u0631\u0627\u0631 \u0648\u0627\u0644\u062a\u0648\u0642\u064a\u0639 / Declaration and signature</h2>${signature ? `<img class="signature" src="${signature}" alt="Visual signature">` : "\u2014"}</section>
<div class="notice"><strong>Visual declaration only:</strong> the signature drawn in this service records the applicant declaration. It is not a qualified electronic signature.</div>
<footer class="footer">\u0646\u0645\u0648\u0630\u062c \u0637\u0644\u0628 \u0645\u0648\u062d\u062f \u2014 \u0644\u0627 \u064a\u062f\u0639\u064a \u0627\u0644\u062a\u0637\u0627\u0628\u0642 \u0645\u0639 \u0642\u0627\u0644\u0628 \u0631\u0633\u0645\u064a \u0645\u0639\u062a\u0645\u062f</footer>
</body></html>`;
}

function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return [
    "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((candidate) => fs.existsSync(candidate)) || null;
}

let queue = Promise.resolve();

async function render(html) {
  const executablePath = resolveExecutablePath();
  if (!executablePath) throw new Error("Chromium executable not found; configure PUPPETEER_EXECUTABLE_PATH");
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
  const task = queue.then(() => render(buildLegalLicenseHtml(application)));
  queue = task.then(() => {}, () => {});
  return task;
}
