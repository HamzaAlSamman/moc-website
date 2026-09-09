import fs from "node:fs";

// المصدر الوحيد لموقع Chromium الذي تشغّله puppeteer-core.
//
// كانت هذه الدالة مكرّرة في مولّدات الـ PDF الثلاثة (الإيصال، الترخيص،
// التذكرة) بقوائم مسارات **مختلفة**: نسخة الإيصال وحدها كانت تعرف مسار
// AlmaLinux `/usr/lib64/chromium-browser/chromium-browser`، فكان إيصال
// حقوق المؤلف يُصدر بنجاح على السيرفر بينما تفشل التذكرة والترخيص بنفس
// اللحظة — وهو فرق لا يظهر إطلاقاً على جهاز التطوير (ويندوز)، ولا عند
// البناء، بل وقت التشغيل على الإنتاج فقط.
//
// أي مسار جديد يُضاف هنا مرة واحدة فيستفيد منه الثلاثة.

export const CHROMIUM_CANDIDATES = Object.freeze([
  // لينكس — AlmaLinux/RHEL أولاً لأنه نظام سيرفر الإنتاج.
  "/usr/lib64/chromium-browser/chromium-browser",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/microsoft-edge",
  "/snap/bin/chromium",
  // ويندوز — أجهزة التطوير.
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
]);

/**
 * مسار المتصفح الصالح، أو null إن لم يوجد أي مرشّح.
 * PUPPETEER_EXECUTABLE_PATH يتقدّم دائماً على الفحص التلقائي.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string|null}
 */
export function resolveChromiumExecutable(env = process.env) {
  const configured = env.PUPPETEER_EXECUTABLE_PATH;
  if (configured) return configured;

  for (const candidate of CHROMIUM_CANDIDATES) {
    try {
      // turbopackIgnore: مسار وقت تشغيل لا يجوز أن يتتبعه المُجمِّع.
      if (fs.existsSync(/* turbopackIgnore: true */ candidate)) return candidate;
    } catch {
      // مسار غير قابل للفحص (صلاحيات مثلاً) ليس سبباً لإيقاف البحث.
    }
  }
  return null;
}

export class ChromiumMissingError extends Error {
  constructor() {
    // رسالة موجّهة لمن يقرأ سجل pm2: تقول ما الذي ينقص وكيف يُصلَح،
    // بدل "فشل إنشاء الملف" التي لا تدل على شيء.
    super(
      "Chromium executable not found — PDF generation is unavailable. "
      + "Install it on the server (AlmaLinux/RHEL: `dnf install -y chromium`, "
      + "Debian/Ubuntu: `apt install -y chromium`) or set PUPPETEER_EXECUTABLE_PATH "
      + `to its full path. Probed: ${CHROMIUM_CANDIDATES.join(", ")}`,
    );
    this.name = "ChromiumMissingError";
    this.code = "CHROMIUM_MISSING";
  }
}

/**
 * مثل resolveChromiumExecutable لكنها ترمي خطأً واضحاً بدل إعادة null.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function requireChromiumExecutable(env = process.env) {
  const executablePath = resolveChromiumExecutable(env);
  if (!executablePath) throw new ChromiumMissingError();
  return executablePath;
}
