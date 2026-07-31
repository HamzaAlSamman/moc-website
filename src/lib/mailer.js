import "server-only";
import nodemailer from "nodemailer";

// ─────────────────────────────────────────────────────────────────────────────
// Shared SMTP transport + email helpers.
//
// The transport logic here is the single source of truth that used to be
// copy-pasted into every public form route (contact, cooperation-contact,
// oversight-complaints) and copyright-mailer.js. New services should import
// `sendMail` / `sendCitizenAck` instead of rebuilding a nodemailer transport.
// ─────────────────────────────────────────────────────────────────────────────

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Ministry mail relay may have an expired/self-signed cert;
      // SMTP_TLS_INSECURE="true" accepts it (otherwise nodemailer rejects the
      // connection with "certificate has expired" and no mail sends).
      tls: { rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== "true" },
    });
  }
  return null;
}

async function getTransport() {
  const transporter = buildTransport();
  if (transporter) return { transporter, isDev: false };
  // In production we must NEVER silently route real messages to a throwaway
  // ethereal.email inbox — they would vanish and the sender would think their
  // submission went through. Fail loudly so the misconfiguration is caught.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SMTP_HOST/SMTP_USER/SMTP_PASS are not configured — email not sent.",
    );
  }
  // Development only: throwaway ethereal.email account, preview URL in the log.
  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
    isDev: true,
  };
}

/**
 * Low-level send. Resolves with the nodemailer `info`. Callers that don't want a
 * failed email to break their request should wrap this in try/catch (or use the
 * fire-and-forget `sendCitizenAck`, which never throws).
 */
export async function sendMail({ from, ...options }) {
  const defaultFrom = process.env.SMTP_FROM || "no-reply@moc.gov.sy";
  const { transporter, isDev } = await getTransport();
  const info = await transporter.sendMail({
    from: from || `"وزارة الثقافة السورية" <${defaultFrom}>`,
    ...options,
  });
  if (isDev) {
    console.log("-----------------------------------------");
    console.log(`📧 Ethereal Email Sent (${options.subject})`);
    console.log(`Recipient: ${options.to}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log("-----------------------------------------");
  }
  return info;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wraps arbitrary content HTML in the ministry's branded email shell.
 * `directorate` is the sub-heading under "الجمهورية العربية السورية".
 */
export function wrapMinistryEmail({ directorate, titleAr, contentHtml }) {
  // Ministry hexagon identity as a lightweight (~0.6KB) seamless tile at 5%
  // opacity, embedded inline. We deliberately do NOT embed the full
  // public/svg/pattern-hex.svg (~80KB) — that would bloat the message past
  // Gmail's 102KB clipping limit and hurt spam scoring. Rendered inline via a
  // data URI with a solid fallback colour, so clients that strip SVG
  // backgrounds (notably Gmail/Outlook) simply show the clean solid design.
  const HEX_TILE =
    "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'>" +
    "<path fill='#002723' fill-opacity='0.05' fill-rule='evenodd' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/>" +
    "</svg>";
  const hexBg = `url(data:image/svg+xml,${encodeURIComponent(HEX_TILE)}) repeat`;
  return `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #fcfcfc; background: #fcfcfc ${hexBg}; border: 1px solid #eaeaea; border-radius: 12px; max-width: 650px; margin: 0 auto;">
      <div style="background-color: #002723; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; border-bottom: 3px solid #B9A779;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">الجمهورية العربية السورية</h2>
        <h3 style="color: #B9A779; margin: 5px 0 0 0; font-size: 15px;">وزارة الثقافة${directorate ? ` - ${escapeHtml(directorate)}` : ""}</h3>
      </div>
      <div style="padding: 24px; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff; background: #ffffff ${hexBg}; color: #333333; line-height: 1.6;">
        <h3 style="color: #002723; border-bottom: 2px solid #B9A779; padding-bottom: 8px; margin-top: 0; font-size: 18px;">${escapeHtml(titleAr)}</h3>
        ${contentHtml}
      </div>
      <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #888888; border-top: 1px solid #eee; padding-top: 15px;">
        وزارة الثقافة السورية. هذه رسالة تلقائية للتأكيد فقط، يُرجى عدم الرد عليها.
      </div>
    </div>
  `;
}

/**
 * Sends a generic "we received your request" acknowledgement to the citizen's
 * OWN email address. Best-effort and self-contained: it swallows every error
 * (SMTP down, no recipient, misconfiguration) so it can never break the request
 * that triggered it. Call it fire-and-forget.
 *
 * @param {object}   opts
 * @param {string}   opts.to           Citizen email. If falsy, nothing is sent.
 * @param {string}  [opts.name]        Citizen name, for the greeting.
 * @param {string}   opts.serviceLabel Human name of the service, e.g. "طلب إقامة فعالية".
 * @param {string}  [opts.directorate] Directorate sub-heading in the header.
 * @param {string}  [opts.reference]   Tracking/reference number, shown if present.
 * @param {string}  [opts.extraNote]   Optional extra reassurance line (plain text).
 */
export async function sendCitizenAck({ to, name, serviceLabel, directorate, reference, extraNote }) {
  const recipient = typeof to === "string" ? to.trim() : "";
  if (!recipient) return; // No email → nothing to send (per product decision).

  try {
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

    await sendMail({
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
    });
  } catch (error) {
    // Best-effort: never let a confirmation email failure break the submission.
    console.error(`Citizen acknowledgement email failed (${serviceLabel}):`, error);
  }
}
