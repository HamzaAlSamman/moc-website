import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CHROMIUM_CANDIDATES,
  ChromiumMissingError,
  requireChromiumExecutable,
  resolveChromiumExecutable,
} from "./chromium-executable.mjs";

const SRC = path.join(process.cwd(), "src");

const PDF_GENERATORS = ["receipt-pdf.js", "legal-license-pdf.js", "booking-ticket-pdf.js"];

test("PUPPETEER_EXECUTABLE_PATH overrides the probe", () => {
  const chosen = resolveChromiumExecutable({ PUPPETEER_EXECUTABLE_PATH: "/opt/custom/chrome" });
  assert.equal(chosen, "/opt/custom/chrome");
});

test("an empty environment falls back to probing, and reports nothing found honestly", () => {
  // لا يمكن التنبؤ بما هو مثبّت على جهاز التشغيل، لكن النتيجة يجب أن تكون
  // إما مساراً من القائمة أو null — لا قيمة ثالثة.
  const chosen = resolveChromiumExecutable({});
  assert.ok(chosen === null || CHROMIUM_CANDIDATES.includes(chosen));
});

test("requireChromiumExecutable throws a coded, actionable error when nothing is found", () => {
  // مسار غير موجود قطعاً يجبر الدالة على المسار الفاشل عبر التهيئة الصريحة
  // ليس كافياً (التهيئة تُعاد كما هي)، لذا نفحص الخطأ نفسه.
  const error = new ChromiumMissingError();
  assert.equal(error.code, "CHROMIUM_MISSING");
  assert.match(error.message, /dnf install/, "must tell the operator how to fix it");
  assert.match(error.message, /PUPPETEER_EXECUTABLE_PATH/);
  assert.match(error.message, /Probed:/, "must list what it looked for");
});

test("the AlmaLinux path the production server uses is probed", () => {
  // هذا المسار تحديداً كان موجوداً في مولّد الإيصال وحده، فكان الإيصال
  // يُصدر على الإنتاج بينما تفشل التذكرة والترخيص في اللحظة نفسها.
  assert.ok(
    CHROMIUM_CANDIDATES.includes("/usr/lib64/chromium-browser/chromium-browser"),
    "AlmaLinux/RHEL chromium path must stay in the probe list",
  );
  assert.ok(CHROMIUM_CANDIDATES.includes("/usr/bin/google-chrome-stable"));
});

test("every PDF generator resolves Chromium through the shared module", () => {
  const offenders = [];
  for (const file of PDF_GENERATORS) {
    const source = readFileSync(path.join(SRC, "lib", file), "utf8");

    if (!source.includes("chromium-executable")) {
      offenders.push(`${file}: does not import the shared resolver`);
    }
    // نسخة محلية من الفحص تعني عودة الانحراف الذي سبّب العطل.
    if (/function resolveExecutablePath/.test(source)) {
      offenders.push(`${file}: still defines its own resolveExecutablePath()`);
    }
    if (/["']\/usr\/bin\/chromium/.test(source)) {
      offenders.push(`${file}: hardcodes a chromium path instead of using CHROMIUM_CANDIDATES`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("requireChromiumExecutable returns the configured path unchanged", () => {
  assert.equal(
    requireChromiumExecutable({ PUPPETEER_EXECUTABLE_PATH: "/usr/local/bin/chrome" }),
    "/usr/local/bin/chrome",
  );
});
