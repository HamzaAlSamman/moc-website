import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendCitizenAck } from "@/lib/queued-mail";
import { nextReferenceNumberSafe, REFERENCE_SCOPES } from "@/lib/reference-number";

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

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const name = body.name?.trim();
    const email = body.email?.trim();
    const subject = body.subject?.trim();
    const message = body.message?.trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة" },
        { status: 400 }
      );
    }

    const safeName = cleanHeaderValue(name);
    const safeEmail = cleanHeaderValue(email);
    const safeSubject = cleanHeaderValue(subject);

    // Load admin setting for recipient email
    const setting = await prisma.setting.findUnique({
      where: { key: "contact_email" }
    });
    const toEmail = setting?.value || "info@moc.gov.sy";

    // SMTP Configuration from environment variables
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "no-reply@moc.gov.sy";

    let transporter;

    if (host && user && pass) {
      // Use configured production SMTP
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        // Ministry mail relay may have an expired/self-signed cert; SMTP_TLS_INSECURE="true" accepts it.
        tls: { rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== "true" }
      });
    } else if (process.env.NODE_ENV === "production") {
      // In production we must NEVER silently route real visitors' messages to a
      // throwaway ethereal.email inbox — they'd vanish without anyone noticing.
      // Fail loudly so the misconfiguration is caught instead of hidden.
      console.error("Contact form: SMTP_HOST/SMTP_USER/SMTP_PASS are not configured in production.");
      return NextResponse.json(
        { error: "خدمة البريد غير مهيأة حالياً، يرجى المحاولة لاحقاً" },
        { status: 503 }
      );
    } else {
      // Development only: generate a free test account on ethereal.email.
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    // Sequential reference (MSG-YYYY-NNNN) so a citizen can quote a number when
    // following up on a message that is delivered by email only.
    const referenceNo = await nextReferenceNumberSafe(REFERENCE_SCOPES.CONTACT);

    const mailOptions = {
      from: `"نموذج تواصل معنا" <${from}>`,
      to: toEmail,
      subject: `${referenceNo ? `[${referenceNo}] ` : ""}رسالة تواصل جديدة: ${safeSubject}`,
      text: `${referenceNo ? `الرقم المتسلسل: ${referenceNo}\n` : ""}اسم المرسل: ${safeName}\nالبريد الإلكتروني: ${safeEmail}\nالموضوع: ${safeSubject}\n\nالرسالة:\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #fcfcfc; border: 1px solid #eaeaea; border-radius: 12px; max-w: 600px; margin: 0 auto;">
          <div style="background-color: #002723; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">وزارة الثقافة السورية</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
            <h3 style="color: #002723; border-bottom: 2px solid #B9A779; padding-bottom: 8px; margin-top: 0;">تفاصيل رسالة تواصل جديدة</h3>
            ${referenceNo ? `<p style="margin: 10px 0;"><strong>الرقم المتسلسل:</strong> <span style="font-family: monospace; font-weight: bold; color: #428177;">${escapeHtml(referenceNo)}</span></p>` : ""}
            <p style="margin: 10px 0;"><strong>اسم المرسل:</strong> ${escapeHtml(safeName)}</p>
            <p style="margin: 10px 0;"><strong>البريد الإلكتروني:</strong> <a href="mailto:${encodeURIComponent(safeEmail)}" style="color: #428177; text-decoration: none;">${escapeHtml(safeEmail)}</a></p>
            <p style="margin: 10px 0;"><strong>الموضوع:</strong> ${escapeHtml(safeSubject)}</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #fbf9f6; border-right: 4px solid #B9A779; border-radius: 4px; font-size: 15px; line-height: 1.6; color: #333333;">
              <strong>نص الرسالة:</strong><br/>
              ${escapeHtml(message).replace(/\n/g, "<br/>")}
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #888888;">
            هذه الرسالة مرسلة بشكل تلقائي من نموذج الاتصال بالموقع الرسمي لوزارة الثقافة السورية.
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    if (!host) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("-----------------------------------------");
      console.log("📧 Ethereal Email Sent (Test Mode)");
      console.log(`Recipient: ${toEmail}`);
      console.log(`Preview URL: ${previewUrl}`);
      console.log("-----------------------------------------");
    }

    // Best-effort acknowledgement to the sender's own email (fire-and-forget so
    // a mail failure never turns a successful submission into an error).
    sendCitizenAck({
      to: safeEmail,
      name: safeName,
      serviceLabel: "رسالة عبر نموذج «تواصل معنا»",
      reference: referenceNo,
      extraNote: `موضوع رسالتك: ${safeSubject}`,
    });

    return NextResponse.json({ success: true, referenceNo });
  } catch (error) {
    console.error("Error sending contact email:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً" },
      { status: 500 }
    );
  }
}
