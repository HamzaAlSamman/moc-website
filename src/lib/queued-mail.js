import "server-only";

import { prisma } from "./prisma";
import { escapeHtml, wrapMinistryEmail } from "./mailer";
import { GENERIC_EMAIL } from "./notification-outbox-core.mjs";
import { deliverOutboxRowNow } from "./notification-outbox";

// ─────────────────────────────────────────────────────────────────────────────
// Every outgoing email is written down before it is attempted.
//
// Until now most mail was fire-and-forget: `sendCitizenAck` swallowed its own
// errors, and a relay hiccup meant the citizen simply never heard back with no
// trace anywhere. `sendMailQueued` has the same signature as `sendMail`, so a
// producer switches to it by changing one import — and in exchange every
// message gets a row in NotificationOutbox: audited, retried by the worker, and
// resendable by hand from /admin/emails.
//
// Delivery is still immediate. The row is written first, then delivered in the
// same request, so nothing waits on the cron.
// ─────────────────────────────────────────────────────────────────────────────

// Attachments are kept as base64 inside payloadJson so a resend carries the
// same document. Past this ceiling the bytes are dropped rather than bloating
// every row of the table — the mail still goes out with its attachment on the
// first attempt; only a later resend would lack it, which the admin screen says
// out loud.
const MAX_STORED_ATTACHMENT_BYTES = 3 * 1024 * 1024;

function packAttachments(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return { stored: [], dropped: false };
  let total = 0;
  const stored = [];
  for (const item of attachments) {
    const content = Buffer.isBuffer(item?.content) ? item.content : null;
    if (!content) return { stored: [], dropped: true };
    total += content.length;
    if (total > MAX_STORED_ATTACHMENT_BYTES) return { stored: [], dropped: true };
    stored.push({
      filename: item.filename,
      contentType: item.contentType,
      contentBase64: content.toString("base64"),
    });
  }
  return { stored, dropped: false };
}

function firstRecipient(to) {
  if (Array.isArray(to)) return to.join(", ").slice(0, 500);
  return String(to ?? "").slice(0, 500);
}

/**
 * Same call shape as `sendMail`, plus two optional labels for the audit screen.
 * Resolves once delivery has been attempted; never throws — the outcome lives
 * on the queued row, and a failed email must not fail the citizen's submission.
 *
 * @param {object} options
 * @param {string|string[]} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.text]
 * @param {Array}  [options.attachments] nodemailer attachments with Buffer content
 * @param {string} [options.kindAr]    e.g. "تأكيد استلام طلب"
 * @param {string} [options.contextAr] e.g. "رسالة عبر نموذج «تواصل معنا»"
 */
export async function sendMailQueued({ to, subject, html, text, attachments, from, kindAr, contextAr }) {
  const recipient = firstRecipient(to);
  if (!recipient) return null;

  const { stored, dropped } = packAttachments(attachments);
  const row = await prisma.notificationOutbox.create({
    data: {
      type: GENERIC_EMAIL,
      recipient,
      subject: subject ? String(subject).slice(0, 500) : null,
      kindAr: kindAr ? String(kindAr).slice(0, 200) : null,
      contextAr: contextAr ? String(contextAr).slice(0, 300) : null,
      payloadJson: {
        subject,
        html,
        ...(text ? { text } : {}),
        ...(from ? { from } : {}),
        ...(stored.length ? { attachments: stored } : {}),
        ...(dropped ? { attachmentsDropped: true } : {}),
      },
    },
    select: { id: true },
  });

  await deliverOutboxRowNow(row.id);
  return row;
}

/**
 * Acknowledgement sent to a citizen the moment a public request is received.
 * Moved here from mailer.js when acknowledgements became queued: it is the
 * highest-volume citizen-facing mail, and the one whose silent failures were
 * hardest to notice.
 */
export async function sendCitizenAck({ to, name, serviceLabel, directorate, reference, extraNote }) {
  const recipient = String(to || "").trim();
  if (!recipient) return null;

  const greeting = name?.trim()
    ? `عزيزنا <strong>${escapeHtml(name.trim())}</strong>،`
    : "عزيزنا مقدّم الطلب،";

  const referenceRow = reference
    ? `
        <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:13px;background:#fdfdfd;border:1px solid #f0f0f0;border-radius:8px;">
          <tr style="background:#f9f9f9;">
            <td style="padding:11px 12px;font-weight:bold;color:#002723;width:45%;">الرقم المرجعي / Reference:</td>
            <td style="padding:11px 12px;font-family:monospace;font-weight:bold;color:#428177;">${escapeHtml(reference)}</td>
          </tr>
        </table>`
    : "";
  const extraNoteHtml = extraNote
    ? `<p style="font-size:13px;color:#444;line-height:1.7;">${escapeHtml(extraNote)}</p>`
    : "";

  const contentHtml = `
      <p style="font-size:14px;">
        ${greeting}<br/>
        نؤكد لك استلام طلبك الخاص بـ<strong>${escapeHtml(serviceLabel)}</strong> عبر الموقع الرسمي لوزارة الثقافة السورية.
        سيتم النظر فيه من قِبل الجهة المختصة، وسيتم التواصل معك عند الحاجة.
      </p>
      ${referenceRow}
      ${extraNoteHtml}
      <div style="margin-top:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;font-size:12px;color:#1e3a8a;line-height:1.6;">
        📌 هذه الرسالة لتأكيد وصول طلبك فقط. لست بحاجة لاتخاذ أي إجراء إضافي.
      </div>
    `;

  return sendMailQueued({
    to: recipient,
    subject: `تأكيد استلام طلبك — ${serviceLabel} | وزارة الثقافة السورية`,
    html: wrapMinistryEmail({ directorate, titleAr: "تم استلام طلبك بنجاح", contentHtml }),
    text:
      `${name?.trim() ? `عزيزنا ${name.trim()}،` : "عزيزنا مقدّم الطلب،"}\n\n` +
      `نؤكد لك استلام طلبك الخاص بـ${serviceLabel} عبر الموقع الرسمي لوزارة الثقافة السورية. ` +
      `سيتم النظر فيه من قِبل الجهة المختصة، وسيتم التواصل معك عند الحاجة.\n` +
      (reference ? `\nالرقم المرجعي: ${reference}\n` : "") +
      (extraNote ? `\n${extraNote}\n` : "") +
      `\nهذه رسالة تلقائية للتأكيد فقط، يُرجى عدم الرد عليها.`,
    kindAr: "تأكيد استلام طلب",
    contextAr: serviceLabel,
  });
}
