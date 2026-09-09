import "server-only";
import nodemailer from "nodemailer";

import { ministryHexTileDataUri } from "./ministry-hex-tile.mjs";

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

export function escapeHtml(value) {
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
  // opacity, embedded inline — see ministry-hex-tile.mjs for why the full
  // public/svg/pattern-hex.svg is never embedded in anything that travels.
  // Rendered via a data URI with a solid fallback colour, so clients that
  // strip SVG backgrounds (notably Gmail/Outlook) show the clean solid design.
  const hexBg = `url(${ministryHexTileDataUri()}) repeat`;
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

// sendCitizenAck moved to queued-mail.js when acknowledgements became queued -
// it now records every message in NotificationOutbox before attempting delivery.
