import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendCitizenAck } from "@/lib/mailer";
import { nextReferenceNumberSafe, REFERENCE_SCOPES } from "@/lib/reference-number";

// Contact channel for the Directorate of International Cooperation. Like the
// general /api/contact endpoint this is email-only — nothing is persisted — but
// it carries a few extra fields (workplace, phone, contact type) and routes to
// the directorate's own inbox rather than the ministry's general one.

// Strip CR/LF so user input can never inject extra mail headers (Bcc:, etc.)
function cleanHeaderValue(value) {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CONTACT_TYPES = {
  complaint:  { ar: "شكوى",  en: "Complaint" },
  suggestion: { ar: "اقتراح", en: "Suggestion" },
  thanks:     { ar: "شكر",   en: "Appreciation" },
};

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`cooperation-contact:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const name = body.name?.trim();
    const email = body.email?.trim();
    const phone = body.phone?.trim();
    const workplace = body.workplace?.trim();
    const contactType = body.contactType;
    const subject = body.subject?.trim();
    const message = body.message?.trim();

    if (!name || !email || !phone || !workplace || !subject || !message) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    if (!CONTACT_TYPES[contactType]) {
      return NextResponse.json({ error: "نوع التواصل غير صالح" }, { status: 400 });
    }

    // Optional supporting images → mail attachments. Defensive caps mirror the
    // client (≤5 images, ≤5MB each) so a crafted request can't blow up the mail.
    const MAX_IMAGES = 5;
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const attachments = [];
    if (Array.isArray(body.images)) {
      for (const img of body.images.slice(0, MAX_IMAGES)) {
        const dataUrl = typeof img?.dataUrl === "string" ? img.dataUrl : "";
        const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) continue;
        const buffer = Buffer.from(match[2], "base64");
        if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) continue;
        const ext = match[1].split("/")[1].replace("+xml", "").replace("jpeg", "jpg");
        const safeImgName = cleanHeaderValue(img?.name || "").replace(/[^\w.\-؀-ۿ ]/g, "").slice(0, 80);
        attachments.push({
          filename: safeImgName || `attachment_${attachments.length + 1}.${ext}`,
          content: buffer,
        });
      }
    }

    const safeName = cleanHeaderValue(name);
    const safeEmail = cleanHeaderValue(email);
    const safePhone = cleanHeaderValue(phone);
    const safeWorkplace = cleanHeaderValue(workplace);
    const safeSubject = cleanHeaderValue(subject);
    const typeAr = CONTACT_TYPES[contactType].ar;

    // Recipient: admin Setting wins, then env, then a safe default. Configure the
    // real directorate inbox via the `cooperation_email` setting or COOPERATION_EMAIL.
    const setting = await prisma.setting.findUnique({ where: { key: "cooperation_email" } });
    const toEmail = setting?.value || process.env.COOPERATION_EMAIL || "cooperation@moc.gov.sy";

    // SMTP Configuration from environment variables
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "no-reply@moc.gov.sy";

    let transporter;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        // Ministry mail relay may have an expired/self-signed cert; SMTP_TLS_INSECURE="true" accepts it.
        tls: { rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== "true" },
      });
    } else if (process.env.NODE_ENV === "production") {
      // Never silently route real messages to a throwaway test inbox in prod.
      console.error("Cooperation contact: SMTP_HOST/SMTP_USER/SMTP_PASS are not configured in production.");
      return NextResponse.json(
        { error: "خدمة البريد غير مهيأة حالياً، يرجى المحاولة لاحقاً" },
        { status: 503 }
      );
    } else {
      // Development only: free test account on ethereal.email.
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }

    // Sequential reference (COP-YYYY-NNNN): this channel is email-only, so the
    // number is the applicant's only handle on their request.
    const referenceNo = await nextReferenceNumberSafe(REFERENCE_SCOPES.COOPERATION);

    const mailOptions = {
      from: `"التواصل مع مديرية التعاون الدولي" <${from}>`,
      to: toEmail,
      // Lets the directorate hit "reply" and answer the applicant directly.
      replyTo: `"${safeName}" <${safeEmail}>`,
      subject: `${referenceNo ? `[${referenceNo}] ` : ""}[${typeAr}] رسالة جديدة لمديرية التعاون الدولي: ${safeSubject}`,
      ...(attachments.length ? { attachments } : {}),
      text:
        (referenceNo ? `الرقم المتسلسل: ${referenceNo}\n\n` : "") +
        `نوع التواصل: ${typeAr}\n` +
        `اسم مقدم الطلب: ${safeName}\n` +
        `جهة العمل: ${safeWorkplace}\n` +
        `البريد الإلكتروني: ${safeEmail}\n` +
        `رقم الهاتف: ${safePhone}\n` +
        `الموضوع: ${safeSubject}\n` +
        (attachments.length ? `عدد المرفقات: ${attachments.length}\n` : "") +
        `\nنص الرسالة:\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #fcfcfc; border: 1px solid #eaeaea; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #002723; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">وزارة الثقافة السورية</h2>
            <p style="color: #A48E68; margin: 6px 0 0; font-size: 13px;">مديرية التعاون الدولي</p>
          </div>
          <div style="padding: 20px; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
            <div style="display: inline-block; background-color: #2563A6; color: #ffffff; font-size: 13px; font-weight: bold; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px;">${escapeHtml(typeAr)}</div>
            <h3 style="color: #002723; border-bottom: 2px solid #B9A779; padding-bottom: 8px; margin-top: 0;">رسالة جديدة عبر بوابة التعاون الدولي</h3>
            <p style="margin: 10px 0;"><strong>اسم مقدم الطلب:</strong> ${escapeHtml(safeName)}</p>
            <p style="margin: 10px 0;"><strong>جهة العمل:</strong> ${escapeHtml(safeWorkplace)}</p>
            <p style="margin: 10px 0;"><strong>البريد الإلكتروني:</strong> <a href="mailto:${encodeURIComponent(safeEmail)}" style="color: #428177; text-decoration: none;">${escapeHtml(safeEmail)}</a></p>
            ${referenceNo ? `<p style="margin: 10px 0;"><strong>الرقم المتسلسل:</strong> <span style="font-family: monospace; font-weight: bold; color: #428177;">${escapeHtml(referenceNo)}</span></p>` : ""}
            <p style="margin: 10px 0;"><strong>رقم الهاتف:</strong> ${escapeHtml(safePhone)}</p>
            <p style="margin: 10px 0;"><strong>الموضوع:</strong> ${escapeHtml(safeSubject)}</p>
            ${attachments.length ? `<p style="margin: 10px 0;"><strong>المرفقات:</strong> ${attachments.length} صورة (مرفقة بهذا البريد)</p>` : ""}
            <div style="margin-top: 20px; padding: 15px; background-color: #fbf9f6; border-right: 4px solid #B9A779; border-radius: 4px; font-size: 15px; line-height: 1.6; color: #333333;">
              <strong>نص الرسالة:</strong><br/>
              ${escapeHtml(message).replace(/\n/g, "<br/>")}
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #888888;">
            هذه الرسالة مرسلة بشكل تلقائي عبر بوابة التواصل مع مديرية التعاون الدولي في الموقع الرسمي لوزارة الثقافة السورية.
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (!host) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("-----------------------------------------");
      console.log("📧 Cooperation Contact Email Sent (Test Mode)");
      console.log(`Recipient: ${toEmail}`);
      console.log(`Preview URL: ${previewUrl}`);
      console.log("-----------------------------------------");
    }

    // Best-effort acknowledgement to the applicant's own email (fire-and-forget).
    sendCitizenAck({
      to: safeEmail,
      name: safeName,
      serviceLabel: "التواصل مع مديرية التعاون الدولي",
      directorate: "مديرية التعاون الدولي",
      reference: referenceNo,
      extraNote: `موضوع رسالتك: ${safeSubject}`,
    });

    return NextResponse.json({ success: true, referenceNo });
  } catch (error) {
    console.error("Error sending cooperation contact email:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً" },
      { status: 500 }
    );
  }
}
