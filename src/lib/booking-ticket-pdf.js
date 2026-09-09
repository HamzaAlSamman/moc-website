import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import { requireChromiumExecutable } from "./chromium-executable.mjs";
import {
  bookingTicketCode,
  bookingTicketPortalUrl,
  formatBookingTicketCode,
} from "./booking-ticket-code.mjs";
import { encodeTicketScanPayload } from "./ticket-scan-payload.mjs";
import { ministryHexTileDataUri } from "./ministry-hex-tile.mjs";

// Same rendering approach as legal-license-pdf.js and receipt-pdf.js:
// puppeteer-core drives the OS-installed Chromium over an HTML document with
// the ministry fonts and imagery inlined as data URIs, so a generated PDF has
// no external dependencies and renders identically on the server and offline.

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
      // The ~0.6 KB seamless tile, not public/svg/pattern-hex.svg. Chromium
      // rasterizes a repeating background into the PDF, so tiling the 136 KB
      // artwork across the header cost 569 KB of a 745 KB ticket — 76% of a
      // document now attached to every booking confirmation email. The tile
      // draws white hexes and the header div's own 0.08 opacity dims them.
      pattern: ministryHexTileDataUri({ color: "#ffffff", opacity: 1 }),
    };
  }
  return cachedAssets;
}

export function escapeTicketHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATUS_LABEL = {
  CONFIRMED: "حجز مؤكد — يرجى التفضل بالدخول",
  WAITLISTED: "على قائمة الانتظار — سيتم إشعاركم في حال توفر مقاعد",
  CANCELLED: "حجز ملغى — غير مصرح بالدخول",
};

const ATTENDANCE_LABEL = {
  NOT_CHECKED_IN: "لم يتم تسجيل الحضور بعد",
  ATTENDED: "تم تسجيل الحضور",
  NO_SHOW: "لم يتم الحضور",
};

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Damascus",
  }).format(new Date(value));
}

export function buildBookingTicketHtml({ booking, code, portalUrl, qrDataUri }) {
  const a = assets();
  const e = escapeTicketHtml;
  const issuedAt = new Date().toISOString();
  const printedCode = formatBookingTicketCode(code);
  const valid = booking.status === "CONFIRMED";
  const docTitle = `تذكرة حضور — ${e(booking.event.titleAr)} — ${e(booking.referenceNo)}`;

  // The metadata block is the "hidden" half of the anti-forgery story the
  // ministry asked for: a genuine ticket carries the reference number, the
  // verification code, the issuing system and the verification URL inside the
  // PDF's own properties. A screenshot re-exported as a PDF, or a file rebuilt
  // in an editor, does not reproduce these fields — and `document-signature`
  // cannot be recomputed at all without BOOKING_TICKET_SECRET.
  const keywords = [
    booking.referenceNo,
    code,
    "تذكرة حضور",
    "وزارة الثقافة السورية",
    "Syrian Ministry of Culture",
    "Event Admission Ticket",
  ].filter(Boolean).join(", ");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>${docTitle}</title>
<meta name="title" content="${docTitle}">
<meta name="author" content="وزارة الثقافة — الجمهورية العربية السورية">
<meta name="subject" content="تذكرة حضور رسمية لفعالية ثقافية">
<meta name="description" content="وثيقة رسمية صادرة عن وزارة الثقافة في الجمهورية العربية السورية — تذكرة حضور اسمية غير قابلة للتداول.">
<meta name="keywords" content="${e(keywords)}">
<meta name="creator" content="بوابة المواطن الرقمية — وزارة الثقافة">
<meta name="producer" content="Syrian Ministry of Culture — Digital Citizen Portal">
<meta name="rights" content="جميع الحقوق محفوظة — وزارة الثقافة في الجمهورية العربية السورية.">
<meta name="date" content="${issuedAt}">
<meta name="language" content="ar">
<meta name="reference-no" content="${e(booking.referenceNo)}">
<meta name="verification-code" content="${e(code)}">
<meta name="verification-url" content="${e(portalUrl)}">
<meta name="document-signature" content="${e(booking.ticketSig)}">
<meta name="booking-status" content="${e(booking.status)}">
<style>
${a.regular ? `@font-face{font-family:'Qomra';font-weight:400;font-style:normal;src:url('${a.regular}') format('opentype');}` : ""}
${a.bold ? `@font-face{font-family:'Qomra';font-weight:700;font-style:normal;src:url('${a.bold}') format('opentype');}` : ""}
@page { size: A4; margin: 14mm; }
*{box-sizing:border-box}
body{font-family:'Qomra',Arial,sans-serif;color:#1e293b;font-size:12px;margin:0;background:#fff}
.ticket{border:1px solid rgba(164,142,104,0.45);border-radius:18px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.04)}
.head{position:relative;background:#003D33;color:#fff;padding:22px 26px;display:flex;align-items:center;gap:18px}
/* Natural tile size — the old 220px scaled up a full-page artwork; this is a
   28×49 seamless tile and repeats at its own dimensions. */
.head .pattern{position:absolute;inset:0;opacity:0.1;background-repeat:repeat;background-size:28px 49px}
.head img.logo{width:62px;height:62px;object-fit:contain;background:#fff;border-radius:12px;padding:6px;position:relative}
.head .titles{position:relative;flex:1}
.head .titles span{display:block;font-size:10px;color:#d6c39d;font-weight:700}
.head .titles h1{margin:6px 0 0;font-size:20px;font-weight:700;line-height:1.35}
.head .titles p{margin:5px 0 0;font-size:11px;color:#cfe6df}
.strip{background:#b9a779;height:5px}
.body{display:flex;gap:22px;padding:24px 26px}
.details{flex:1}
.row{display:flex;border-bottom:1px solid #f1f5f9;padding:11px 0}
.row:last-child{border-bottom:none}
.row dt{width:34%;margin:0;color:#64748b;font-size:11px;font-weight:700}
.row dd{margin:0;flex:1;color:#0f172a;font-size:13px;font-weight:700}
.stub{width:216px;border:2px dashed rgba(164,142,104,0.5);border-radius:16px;background:#faf9f5;padding:16px;text-align:center}
.stub img{width:150px;height:150px;display:block;margin:0 auto}
.stub .ref{margin-top:10px;font-family:Arial,sans-serif;direction:ltr;font-size:13px;font-weight:700;color:#002723;letter-spacing:1px}
.stub .code{margin-top:6px;font-family:Arial,sans-serif;direction:ltr;font-size:15px;font-weight:700;color:#006455;letter-spacing:2px}
.stub .caption{margin-top:4px;font-size:9px;color:#94a3b8}
.state{margin:0 26px 22px;border-radius:12px;padding:12px 16px;font-size:12px;font-weight:700;text-align:center}
.state.valid{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
.state.invalid{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.notes{margin:0 26px 24px;background:#fff8e6;border:1px solid #ead69d;border-radius:12px;padding:14px 16px;color:#604d19;font-size:11px;line-height:1.9}
.notes b{display:block;margin-bottom:4px;color:#4b3d12}
.foot{border-top:1px solid #e2e8f0;padding:14px 26px;color:#64748b;font-size:10px;text-align:center;line-height:1.8}
.foot .url{direction:ltr;color:#94a3b8;font-size:9px;word-break:break-all}
</style></head><body>
<div class="ticket">
  <div class="head">
    ${a.pattern ? `<div class="pattern" style="background-image:url('${a.pattern}')"></div>` : ""}
    ${a.logo ? `<img class="logo" src="${a.logo}" alt="">` : ""}
    <div class="titles">
      <span>الجمهورية العربية السورية — وزارة الثقافة</span>
      <h1>${e(booking.event.titleAr)}</h1>
      <p>بطاقة حضور رسمية — اسمية وغير قابلة للتداول</p>
    </div>
  </div>
  <div class="strip"></div>
  <div class="body">
    <dl class="details">
      <div class="row"><dt>اسم المستفيد</dt><dd>${e(booking.fullName)}</dd></div>
      <div class="row"><dt>الرقم الوطني</dt><dd>ينتهي بـ ${e(booking.nationalIdLast4)}</dd></div>
      <div class="row"><dt>تاريخ ووقت الفعالية</dt><dd>${e(formatDateTime(booking.event.startDate))}</dd></div>
      <div class="row"><dt>مكان الفعالية</dt><dd>${e(booking.event.location || "—")}</dd></div>
      <div class="row"><dt>المحافظة</dt><dd>${e(booking.event.governorate || "—")}</dd></div>
      <div class="row"><dt>حالة الحضور</dt><dd>${e(ATTENDANCE_LABEL[booking.attendanceStatus] || "—")}</dd></div>
    </dl>
    <div class="stub">
      ${qrDataUri ? `<img src="${qrDataUri}" alt="">` : ""}
      <div class="ref">${e(booking.referenceNo)}</div>
      <div class="code">${e(printedCode)}</div>
      <div class="caption">رمز التحقق</div>
    </div>
  </div>
  <div class="state ${valid ? "valid" : "invalid"}">${e(STATUS_LABEL[booking.status] || booking.status)}</div>
  <div class="notes">
    <b>تعليمات الدخول</b>
    يرجى التكرم بإبراز هذه البطاقة مصحوبة بالوثائق الثبوتية الشخصية لتمكين المعنيين من مسح رمز الاستجابة وتسهيل دخولكم. هذه البطاقة اسمية ومخصصة للمستفيد الأول فقط، ولا يجوز نقل ملكيتها أو تداولها.
  </div>
  <div class="foot">
    للاستعلام عن صلاحية البطاقة، يرجى زيارة الرابط الرسمي وإدخال الرقم المرجعي ورمز التحقق المبيّنين أعلاه:
    <div class="url">${e(portalUrl)}</div>
  </div>
</div>
</body></html>`;
}

// Serialized like the other PDF generators: one Chromium at a time keeps a
// burst of downloads from exhausting the 1 GB heap the server runs with.
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

// The QR carries the encrypted scan payload — not a link. Pointing a phone
// camera at a ticket now yields an unactionable string, and only the
// ministry's own scanner (/admin/scan) can turn it back into a booking. See
// ticket-scan-payload.mjs for why that is obscurity layered on top of the real
// control rather than the control itself.
//
// Error correction is bumped to "Q": the payload is longer than the old URL,
// the modules are denser, and these codes are read off creased paper under bad
// light at a venue door.
export async function buildBookingTicketQr(booking, locale = "ar") {
  const code = bookingTicketCode(booking.ticketSig);
  const payload = encodeTicketScanPayload({ referenceNo: booking.referenceNo, code });
  const portalUrl = bookingTicketPortalUrl(locale);
  const qrDataUri = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "Q",
    margin: 1,
    width: 320,
    color: { dark: "#003D33", light: "#FFFFFFFF" },
  });
  return { code, payload, portalUrl, qrDataUri };
}

export function generateBookingTicketPdf(booking, locale = "ar") {
  const task = queue.then(async () => {
    const { code, portalUrl, qrDataUri } = await buildBookingTicketQr(booking, locale);
    return render(buildBookingTicketHtml({ booking, code, portalUrl, qrDataUri }));
  });
  queue = task.then(() => {}, () => {});
  return task;
}
