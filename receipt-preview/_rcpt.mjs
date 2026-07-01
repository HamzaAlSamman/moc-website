import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

// ---------------------------------------------------------------------------
// Official payment-receipt PDF generator (Syrian Ministry of Culture identity)
// ---------------------------------------------------------------------------
// Renders an A4 receipt as HTML (perfect Arabic shaping/bidi via Chromium) and
// converts it to a PDF Buffer that the copyright mailer attaches to the email.
//
// On the server we use puppeteer-core + the OS-installed Chromium (set
// PUPPETEER_EXECUTABLE_PATH, or rely on the common-path probe below) to keep
// the install/footprint small. Generation is serialized through a queue so we
// never hold two Chromium processes at once on the memory-constrained host.
// ---------------------------------------------------------------------------

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Read once, reuse forever — these assets are deployed with the app.
let cachedAssets = null;
function loadAssets() {
  if (cachedAssets) return cachedAssets;
  const toDataUri = (file, mime) => {
    try {
      const buf = fs.readFileSync(path.join(PUBLIC_DIR, file));
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  };
  cachedAssets = {
    fontRegular: toDataUri("fonts/itfQomraArabic-Regular.otf", "font/otf"),
    fontBold: toDataUri("fonts/itfQomraArabic-Bold.otf", "font/otf"),
    logo: toDataUri("logo.png", "image/png"),
    // Same decorative motif (white-gradient ornament over green) used on the
    // admin dashboard header bar, so the receipt header carries the MOC identity.
    navShape: toDataUri("moc-nav-shape.svg", "image/svg+xml"),
  };
  return cachedAssets;
}

// Probe the usual locations so the same code runs on the AlmaLinux server and a
// Windows dev box without extra config. PUPPETEER_EXECUTABLE_PATH always wins.
function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/lib64/chromium-browser/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

const GATEWAY_NAMES = {
  syriatel_cash: "سيريتل كاش / Syriatel Cash",
  mtn_cash: "كاش موبايل / Cash Mobile",
  cham_cash: "شام كاش / Cham Cash",
};

const PROVINCE_LABEL = (sub) =>
  [sub.province, sub.center].filter(Boolean).join(" - ") || "—";

// Per-stage receipt content. `initial` = first deposit (500 + 50 stamps = 550),
// `final` = the issuance fee (500) paid after legal approval.
function stageConfig(stage) {
  if (stage === "final") {
    return {
      docTitle: "إيصال دفع الرسم النهائي",
      docTitleEn: "Final Fee Payment Receipt",
      lines: [{ label: "رسم إصدار شهادة حماية المصنف (الرسم النهائي)", value: "500 ل.س" }],
      total: "500 ل.س",
    };
  }
  return {
    docTitle: "إيصال دفع الرسم الأولي",
    docTitleEn: "Initial Fee Payment Receipt",
    lines: [
      { label: "رسم إيداع وحماية المصنف (الرسم الأولي)", value: "500 ل.س" },
      { label: "رسوم طوابع الخدمات الإلكترونية", value: "50 ل.س" },
    ],
    total: "550 ل.س",
  };
}

function formatDate(d = new Date()) {
  try {
    return new Intl.DateTimeFormat("ar-SY-u-ca-gregory", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return new Date().toISOString().replace("T", " ").slice(0, 16);
  }
}

// Minimal escaping so applicant-supplied fields can't break the receipt markup.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildReceiptHtml(submission, stage = "initial") {
  const { fontRegular, fontBold, logo, navShape } = loadAssets();
  const cfg = stageConfig(stage);
  const gateway = GATEWAY_NAMES[submission.paymentGateway] || submission.paymentGateway || "—";
  const issuedAt = formatDate();
  const receiptNo = `${submission.id}-${stage === "final" ? "F" : "I"}`;

  const fontFaces = `
    ${fontRegular ? `@font-face{font-family:'Qomra';font-weight:400;font-style:normal;src:url('${fontRegular}') format('opentype');}` : ""}
    ${fontBold ? `@font-face{font-family:'Qomra';font-weight:700;font-style:normal;src:url('${fontBold}') format('opentype');}` : ""}
  `;

  const feeRows = cfg.lines
    .map(
      (l) => `
      <tr>
        <td class="fee-label">${esc(l.label)}</td>
        <td class="fee-value">${esc(l.value)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  ${fontFaces}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 0; }
  html, body {
    font-family: 'Qomra', 'Arial', sans-serif;
    color: #1f2a28;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { padding: 18mm 16mm; background: #ffffff; }
  .sheet { border: 1.5px solid #d9cfb6; border-radius: 14px; overflow: hidden; }
  .header {
    position: relative; background: #002723; color: #fff; padding: 22px 26px;
    border-bottom: 4px solid #B9A779; display: flex; align-items: center; gap: 18px;
    overflow: hidden;
  }
  /* Dashboard decorative motif (white-gradient ornament) anchored to the header. */
  .header-deco {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    /* Stack the motif twice to lift its effective opacity (the SVG itself caps
       at 0.3 white), so the ornament reads a bit stronger over the green. */
    background-image: url('${navShape || ""}'), url('${navShape || ""}');
    background-repeat: repeat-x, repeat-x;
    background-position: bottom center, bottom center;
    background-size: auto 100%, auto 100%;
    opacity: 1;
  }
  .header > * { position: relative; z-index: 1; }
  .header img { width: 64px; height: 64px; object-fit: contain; background:#fff; border-radius:10px; padding:4px; }
  .header .titles { flex: 1; text-align: center; }
  .header h1 { font-size: 21px; font-weight: 700; letter-spacing: .3px; }
  .header h2 { font-size: 14px; color: #B9A779; margin-top: 4px; font-weight: 700; }
  .doc-band {
    background: #fbf9f6; padding: 14px 26px; border-bottom: 1px solid #efe7d4;
    display: flex; justify-content: space-between; align-items: center;
  }
  .doc-band .doc-title { font-size: 18px; font-weight: 700; color: #002723; }
  .doc-band .doc-title small { display:block; font-size: 11px; color:#9a8f76; font-weight:400; margin-top:2px; }
  .doc-band .badge {
    background:#0a3c34; color:#fff; font-size:12px; font-weight:700;
    padding:8px 14px; border-radius:8px; border-bottom:2px solid #B9A779;
  }
  .body { padding: 24px 26px; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px; }
  .meta td { padding: 11px 12px; border: 1px solid #eee; }
  .meta tr:nth-child(odd) td:first-child,
  .meta tr td.k { background: #f7f5ef; font-weight: 700; color: #002723; width: 32%; }
  .invoice {
    background: #fbf9f6; border: 1px solid #f0eada; border-right: 4px solid #B9A779;
    border-radius: 10px; padding: 16px 18px; margin-top: 6px;
  }
  .invoice h3 { font-size: 14px; color:#002723; border-bottom:1px dashed #e4d7be; padding-bottom:8px; margin-bottom:10px; }
  .invoice table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .invoice td { padding: 7px 4px; }
  .fee-value { text-align: left; font-weight: 700; }
  .total-row td { border-top: 1.5px dashed #d9cfb6; padding-top: 11px; font-size: 15px; color:#002723; font-weight:700; }
  .stamp {
    margin-top: 22px; display:flex; justify-content: space-between; align-items:center; gap:16px;
  }
  .verified {
    border: 2px solid #15803d; color:#15803d; border-radius: 10px;
    padding: 10px 18px; font-weight: 700; font-size: 14px; transform: rotate(-4deg);
    text-align:center; line-height:1.4;
  }
  .verified small { display:block; font-size:10px; font-weight:400; }
  .note { font-size: 11px; color:#6b6457; line-height:1.7; flex:1; }
  .footer {
    background:#002723; color:#cfc6ad; text-align:center; font-size:10.5px;
    padding: 12px 20px; line-height:1.6;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      ${navShape ? `<div class="header-deco"></div>` : ""}
      ${logo ? `<img src="${logo}" alt="logo" />` : ""}
      <div class="titles">
        <h1>الجمهورية العربية السورية</h1>
        <h2>وزارة الثقافة — مديرية الشؤون المالية</h2>
      </div>
      ${logo ? `<img src="${logo}" alt="logo" style="visibility:hidden" />` : ""}
    </div>

    <div class="doc-band">
      <div class="doc-title">${esc(cfg.docTitle)}<small>${esc(cfg.docTitleEn)}</small></div>
      <div class="badge">رقم الإيصال: ${esc(receiptNo)}</div>
    </div>

    <div class="body">
      <table class="meta">
        <tr><td class="k">اسم المودع / Applicant</td><td>${esc(submission.applicantName)}</td></tr>
        <tr><td class="k">رمز المعاملة / Request ID</td><td>${esc(submission.id)}</td></tr>
        <tr><td class="k">عنوان المصنف / Work Title</td><td>${esc(submission.workTitle)}</td></tr>
        <tr><td class="k">مركز الإيداع / Center</td><td>${esc(PROVINCE_LABEL(submission))}</td></tr>
        <tr><td class="k">بوابة الدفع / Gateway</td><td>${esc(gateway)}</td></tr>
        <tr><td class="k">رقم مرجع الحوالة / Reference</td><td>${esc(submission.paymentRef || "—")}</td></tr>
        <tr><td class="k">تاريخ الإصدار / Issued</td><td>${esc(issuedAt)}</td></tr>
      </table>

      <div class="invoice">
        <h3>تفصيل الرسوم المسددة / Fee Breakdown</h3>
        <table>
          ${feeRows}
          <tr class="total-row">
            <td>إجمالي المبلغ المسدّد / Total Paid</td>
            <td class="fee-value">${esc(cfg.total)}</td>
          </tr>
        </table>
      </div>

      <div class="stamp">
        <div class="note">
          هذا الإيصال وثيقة إلكترونية رسمية صادرة آلياً عن بوابة حماية حقوق المؤلف،
          ويعتمد رقم المعاملة أعلاه لتتبّع الطلب. تم تدقيق الدفعة واعتمادها من قبل
          مديرية الشؤون المالية في الوزارة.
        </div>
        <div class="verified">
          مدفوع وموثّق
          <small>PAID &amp; VERIFIED</small>
        </div>
      </div>
    </div>

    <div class="footer">
      وزارة الثقافة — الجمهورية العربية السورية، دمشق · مديرية الشؤون المالية<br/>
      هذه وثيقة موثّقة رقمياً ولا تحتاج إلى توقيع يدوي.
    </div>
  </div>
</body>
</html>`;
}

// Serialize generation: one Chromium at a time on the memory-constrained host.
let queue = Promise.resolve();

async function renderPdf(html) {
  const executablePath = resolveExecutablePath();
  if (!executablePath) {
    throw new Error(
      "Chromium executable not found. Install it (e.g. `dnf install chromium`) " +
        "or set PUPPETEER_EXECUTABLE_PATH."
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    // Always tear Chromium down so it never lingers holding RAM.
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Generate the official payment-receipt PDF for a copyright submission.
 * @param {object} submission - Prisma CopyrightSubmission record.
 * @param {{ stage?: "initial" | "final" }} [opts]
 * @returns {Promise<Buffer>} the PDF bytes.
 */
export function generateReceiptPdf(submission, { stage = "initial" } = {}) {
  const html = buildReceiptHtml(submission, stage);
  const task = queue.then(() => renderPdf(html));
  // Keep the chain alive regardless of this task's outcome.
  queue = task.then(
    () => {},
    () => {}
  );
  return task;
}
