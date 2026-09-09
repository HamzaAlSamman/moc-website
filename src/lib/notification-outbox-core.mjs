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

// The notifications that mean "you have a seat" — and are therefore the only
// ones worth spending a Chromium render on. A waitlisted or cancelled booking
// has no admissible ticket, so attaching one would be worse than useless: it
// would be a document that gets turned away at the door.
const TICKET_NOTIFICATIONS = new Set(["BOOKING_CONFIRMED", "BOOKING_PROMOTED"]);

export function notificationCarriesTicket(type) {
  return TICKET_NOTIFICATIONS.has(type);
}

// Every other email the site sends — request acknowledgements, copyright
// correspondence, licence decisions, OTP and password-reset mail — is composed
// by its own module and arrives here already rendered. Rather than move a dozen
// templates into this file, those are queued under one type whose payload IS
// the finished message. The queue then gives all of them the same three things
// the typed notifications already had: a durable record, bounded retries, and
// an operator who can resend from the admin screen.
export const GENERIC_EMAIL = "GENERIC_EMAIL";

export function isGenericEmail(type) {
  return type === GENERIC_EMAIL;
}

const TYPE_LABELS = Object.freeze({
  BOOKING_CONFIRMED: "تأكيد حجز",
  BOOKING_WAITLISTED: "قائمة انتظار",
  BOOKING_PROMOTED: "تأكيد مقعد",
  BOOKING_CANCELLED: "إلغاء حجز",
  EVENT_CANCELLED: "إلغاء فعالية",
  CITIZEN_IDENTITY_VERIFIED: "توثيق هوية",
  CITIZEN_IDENTITY_REJECTED: "رفض توثيق هوية",
});

// What the audit screen prints in the "النوع" column. Falls back to the raw
// type so a notification added later is still legible before it gets a label.
export function outboxTypeLabel(row) {
  if (row?.kindAr) return row.kindAr;
  if (isGenericEmail(row?.type)) return "رسالة بريدية";
  return TYPE_LABELS[row?.type] || row?.type || "—";
}

export const OUTBOX_STATUS_LABELS = Object.freeze({
  PENDING: "بانتظار الإرسال",
  PROCESSING: "قيد الإرسال",
  SENT: "تم الإرسال",
  FAILED: "فشل نهائي",
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

  // Two ways to the same ticket, because either one can fail on its own: the
  // attachment is useless if a mail client strips PDFs, and the link is
  // useless offline at the venue door. Only rendered for the ticket-bearing
  // types — `ticketAttached` stays false when the render failed, so the mail
  // never promises an attachment it does not carry.
  const ticket = notificationCarriesTicket(type) ? {
    url: typeof payload.ticketUrl === "string" ? payload.ticketUrl : "",
    attached: payload.ticketAttached === true,
  } : { url: "", attached: false };

  const ticketHtml = ticket.url || ticket.attached
    ? `<div style="margin:18px 0;padding:16px;background:#f0f7f4;border:1px solid #cfe6df;border-radius:8px">
        <p style="margin:0 0 10px;font-weight:bold;color:#002723">تذكرة الحضور</p>
        ${ticket.attached ? `<p style="margin:0 0 10px;font-size:13px;color:#333">تجد تذكرتك مرفقة بهذه الرسالة بصيغة PDF — احتفظ بها واعرضها عند مدخل القاعة.</p>` : ""}
        ${ticket.url ? `<p style="margin:0"><a href="${escapeHtml(ticket.url)}" style="display:inline-block;background:#003D33;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold;font-size:14px">تحميل التذكرة من حسابك</a></p>` : ""}
        <p style="margin:10px 0 0;font-size:12px;color:#666">التذكرة اسمية وغير قابلة للتداول. يرجى إبرازها مع وثيقة إثبات الهوية.</p>
      </div>`
    : "";

  const html = `<p>مرحباً ${escapeHtml(name)}،</p><p>${escapeHtml(lead)}.</p>${rows ? `<table style="width:100%;border-collapse:collapse;background:#f8faf8">${rows}</table>` : ""}${ticketHtml}<p style="font-size:12px;color:#666">هذه رسالة تلقائية من وزارة الثقافة السورية، يرجى عدم الرد عليها.</p>`;
  const textDetails = details.map(([label, value]) => `${label}: ${value}`).join("\n");
  const ticketText = [
    ticket.attached ? "تذكرة الحضور مرفقة بهذه الرسالة بصيغة PDF." : "",
    ticket.url ? `تحميل التذكرة من حسابك: ${ticket.url}` : "",
  ].filter(Boolean).join("\n");

  return {
    subject: `${subject} | وزارة الثقافة السورية`,
    title: subject,
    html,
    text: `مرحباً ${name}،\n${lead}.\n${textDetails}${ticketText ? `\n\n${ticketText}` : ""}`.trim(),
  };
}

export function createNotificationOutboxProcessor({ repository, send, now = () => new Date() }) {
  if (!repository || typeof send !== "function") throw new TypeError("Outbox processor requires repository and sender");
  return Object.freeze({
    async process({ workerId, batchSize, onlyId = null }) {
      const rows = await repository.claimBatch({ workerId, batchSize, now: now(), onlyId });
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
