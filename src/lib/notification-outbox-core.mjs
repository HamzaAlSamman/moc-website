import { timingSafeEqual } from "node:crypto";

const MINUTE = 60_000;
const DAY = 86_400_000;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeError(error) {
  const name = typeof error?.name === "string" ? error.name.slice(0, 80) : "Error";
  const code = typeof error?.code === "string" ? ` (${error.code.slice(0, 40)})` : "";
  return `${name}${code}: notification delivery failed`.slice(0, 500);
}

export function isOutboxCronAuthorized(header, secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("OUTBOX_CRON_SECRET must contain at least 32 characters");
  }
  const match = typeof header === "string" ? /^Bearer\s+(.+)$/i.exec(header) : null;
  if (!match) return false;
  const provided = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(secret, "utf8");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function backoffDelayMs(attempts) {
  const exponent = Math.max(0, Math.min(30, Number(attempts || 1) - 1));
  return Math.min(DAY, MINUTE * (2 ** exponent));
}

const NOTIFICATIONS = Object.freeze({
  BOOKING_CONFIRMED: ["تأكيد حجزك", "تم تأكيد حجزك في الفعالية"],
  BOOKING_WAITLISTED: ["قائمة انتظار الفعالية", "أُضيف اسمك إلى قائمة الانتظار"],
  BOOKING_PROMOTED: ["تم تأكيد مقعدك", "انتقلت من قائمة الانتظار وأصبح مقعدك مؤكداً"],
  BOOKING_CANCELLED: ["إلغاء الحجز", "تم إلغاء حجزك"],
  EVENT_CANCELLED: ["إلغاء الفعالية", "نأسف لإبلاغك بإلغاء الفعالية"],
  CITIZEN_IDENTITY_VERIFIED: ["تم توثيق هويتك", "اكتملت مراجعة هويتك بنجاح ويمكنك الآن حجز الفعاليات"],
  CITIZEN_IDENTITY_REJECTED: ["نتيجة مراجعة الهوية", "تعذر اعتماد صور الهوية المرسلة"],
});

export function renderOutboxNotification(type, payload = {}) {
  const template = NOTIFICATIONS[type];
  if (!template) throw new Error(`Unsupported notification type: ${String(type).slice(0, 80)}`);
  const [subject, lead] = template;
  const name = String(payload.fullName || "عزيزنا المواطن");
  const details = [];
  if (payload.eventTitle) details.push(["الفعالية", payload.eventTitle]);
  if (payload.eventStart) details.push(["الموعد", new Date(payload.eventStart).toLocaleString("ar-SY", { timeZone: "Asia/Damascus" })]);
  if (payload.eventLocation) details.push(["المكان", payload.eventLocation]);
  if (payload.referenceNo) details.push(["الرقم المرجعي", payload.referenceNo]);
  if (payload.reason) details.push(["السبب", payload.reason]);
  const rows = details.map(([label, value]) => `<tr><td style="padding:8px;font-weight:bold;color:#002723">${escapeHtml(label)}</td><td style="padding:8px">${escapeHtml(value)}</td></tr>`).join("");
  const html = `<p>مرحباً ${escapeHtml(name)}،</p><p>${escapeHtml(lead)}.</p>${rows ? `<table style="width:100%;border-collapse:collapse;background:#f8faf8">${rows}</table>` : ""}<p style="font-size:12px;color:#666">هذه رسالة تلقائية من وزارة الثقافة السورية، يرجى عدم الرد عليها.</p>`;
  const textDetails = details.map(([label, value]) => `${label}: ${value}`).join("\n");
  return { subject: `${subject} | وزارة الثقافة السورية`, title: subject, html, text: `مرحباً ${name}،\n${lead}.\n${textDetails}`.trim() };
}

export function createNotificationOutboxProcessor({ repository, send, now = () => new Date() }) {
  if (!repository || typeof send !== "function") throw new TypeError("Outbox processor requires repository and sender");
  return Object.freeze({
    async process({ workerId, batchSize }) {
      const rows = await repository.claimBatch({ workerId, batchSize, now: now() });
      const result = { claimed: rows.length, sent: 0, retried: 0, failed: 0 };
      for (const row of rows) {
        try {
          await send(row);
          await repository.markSent(row, { workerId, sentAt: now() });
          result.sent += 1;
        } catch (error) {
          const terminal = row.attempts >= row.maxAttempts;
          await repository.markFailed(row, {
            workerId,
            terminal,
            error: safeError(error),
            availableAt: new Date(now().getTime() + backoffDelayMs(row.attempts)),
          });
          if (terminal) result.failed += 1;
          else result.retried += 1;
        }
      }
      return result;
    },
  });
}
