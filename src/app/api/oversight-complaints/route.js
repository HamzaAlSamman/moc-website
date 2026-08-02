import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendCitizenAck } from "@/lib/mailer";
import { nextReferenceNumberSafe, REFERENCE_SCOPES } from "@/lib/reference-number";

// Complaint channel for the Internal Oversight Directorate. Email-only —
// nothing is persisted — and deliberately allows fully anonymous complaints:
// name/email/phone are optional, and the client clears them entirely when the
// citizen opts into anonymous mode (see page.js). We never require identity
// to accept a complaint.

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

const CATEGORIES = {
  financial_admin_corruption: { ar: "فساد مالي أو إداري", en: "Financial or Administrative Corruption" },
  power_abuse:                { ar: "تجاوز أو سوء استخدام السلطة", en: "Abuse of Authority" },
  public_mistreatment:        { ar: "سوء معاملة الجمهور", en: "Mistreatment of the Public" },
  negligence:                 { ar: "إهمال أو تقصير وظيفي", en: "Negligence or Dereliction of Duty" },
  other:                      { ar: "أخرى", en: "Other" },
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`oversight-complaint:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const isAnonymous = Boolean(body.isAnonymous);
    const name = isAnonymous ? "" : (body.name?.trim() || "");
    const email = isAnonymous ? "" : (body.email?.trim() || "");
    const phone = isAnonymous ? "" : (body.phone?.trim() || "");
    const category = body.category;
    const against = body.against?.trim();
    const subject = body.subject?.trim();
    const incidentDate = body.incidentDate?.trim() || "";
    const message = body.message?.trim();

    if (!isAnonymous && (!name || !email || !phone)) {
      return NextResponse.json(
        { error: "يرجى إدخال الاسم والبريد الإلكتروني ورقم الهاتف، أو اختيار تقديم الشكوى دون الكشف عن الهوية" },
        { status: 400 }
      );
    }
    if (!isAnonymous && !emailRegex.test(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }
    if (!against || !subject || !message) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة يجب تعبئتها" }, { status: 400 });
    }
    if (!CATEGORIES[category]) {
      return NextResponse.json({ error: "نوع الشكوى غير صالح" }, { status: 400 });
    }
    if (incidentDate) {
      const parsedIncidentDate = new Date(incidentDate);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      if (Number.isNaN(parsedIncidentDate.getTime()) || parsedIncidentDate > endOfToday) {
        return NextResponse.json({ error: "تاريخ الواقعة لا يمكن أن يكون في المستقبل" }, { status: 400 });
      }
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
        const safeName = cleanHeaderValue(img?.name || "").replace(/[^\w.\-؀-ۿ ]/g, "").slice(0, 80);
        attachments.push({
          filename: safeName || `evidence_${attachments.length + 1}.${ext}`,
          content: buffer,
        });
      }
    }

    const safeName = name ? cleanHeaderValue(name) : "";
    const safeEmail = email ? cleanHeaderValue(email) : "";
    const safePhone = phone ? cleanHeaderValue(phone) : "";
    const safeAgainst = cleanHeaderValue(against);
    const safeSubject = cleanHeaderValue(subject);
    const safeIncidentDate = incidentDate ? cleanHeaderValue(incidentDate) : "";
    const categoryAr = CATEGORIES[category].ar;

    // Recipient: admin Setting wins, then env, then a safe default. Configure the
    // real directorate inbox via the `oversight_email` setting or OVERSIGHT_EMAIL.
    const setting = await prisma.setting.findUnique({ where: { key: "oversight_email" } });
    const toEmail = setting?.value || process.env.OVERSIGHT_EMAIL || "oversight@moc.gov.sy";

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
      console.error("Oversight complaint: SMTP_HOST/SMTP_USER/SMTP_PASS are not configured in production.");
      return NextResponse.json(
        { error: "خدمة البريد غير مهيأة حالياً، يرجى المحاولة لاحقاً" },
        { status: 503 }
      );
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }

    // Sequential reference (OVS-YYYY-NNNN). This is the only handle an anonymous
    // complainant has on their complaint, so it goes in the subject line too.
    const referenceNo = await nextReferenceNumberSafe(REFERENCE_SCOPES.OVERSIGHT);

    const anonymityLine = isAnonymous || !safeEmail
      ? "شكوى مجهولة — لم يتم تقديم أي معلومات تواصل عن مقدّمها."
      : null;

    const mailOptions = {
      from: `"بوابة شكاوى الرقابة الداخلية" <${from}>`,
      to: toEmail,
      // Only settable when the complainant chose to share contact info.
      ...(safeEmail ? { replyTo: `"${safeName || "مقدّم الشكوى"}" <${safeEmail}>` } : {}),
      subject: `${referenceNo ? `[${referenceNo}] ` : ""}[${categoryAr}]${isAnonymous ? " [مجهول]" : ""} شكوى جديدة لمديرية الرقابة الداخلية: ${safeSubject}`,
      ...(attachments.length ? { attachments } : {}),
      text:
        (referenceNo ? `الرقم المتسلسل للشكوى: ${referenceNo}\n\n` : "") +
        (anonymityLine ? `${anonymityLine}\n\n` : "") +
        `نوع الشكوى: ${categoryAr}\n` +
        (safeName ? `اسم مقدّم الشكوى: ${safeName}\n` : "") +
        (safeEmail ? `البريد الإلكتروني: ${safeEmail}\n` : "") +
        (safePhone ? `رقم الهاتف: ${safePhone}\n` : "") +
        `الجهة أو الشخص المشكو بحقه: ${safeAgainst}\n` +
        (safeIncidentDate ? `تاريخ الواقعة: ${safeIncidentDate}\n` : "") +
        `الموضوع: ${safeSubject}\n` +
        (attachments.length ? `عدد المرفقات: ${attachments.length}\n` : "") +
        `\nتفاصيل الشكوى:\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #fcfcfc; border: 1px solid #eaeaea; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #002723; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">وزارة الثقافة السورية</h2>
            <p style="color: #A48E68; margin: 6px 0 0; font-size: 13px;">مديرية الرقابة الداخلية</p>
          </div>
          <div style="padding: 20px; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
            <div style="display: inline-block; background-color: #8B2635; color: #ffffff; font-size: 13px; font-weight: bold; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px;">${escapeHtml(categoryAr)}</div>
            ${referenceNo ? `<div style="background-color: #f4faf8; border: 1px solid #cfe6df; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 13px; color: #002723;"><strong>الرقم المتسلسل للشكوى:</strong> <span style="font-family: monospace; font-weight: bold; color: #428177; letter-spacing: 1px;">${escapeHtml(referenceNo)}</span></div>` : ""}
            ${anonymityLine ? `<div style="background-color: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-size: 12px; font-weight: bold; padding: 8px 12px; border-radius: 8px; margin-bottom: 12px;">⚠️ ${escapeHtml(anonymityLine)}</div>` : ""}
            <h3 style="color: #002723; border-bottom: 2px solid #B9A779; padding-bottom: 8px; margin-top: 0;">شكوى جديدة عبر بوابة الرقابة الداخلية</h3>
            ${safeName ? `<p style="margin: 10px 0;"><strong>اسم مقدّم الشكوى:</strong> ${escapeHtml(safeName)}</p>` : ""}
            ${safeEmail ? `<p style="margin: 10px 0;"><strong>البريد الإلكتروني:</strong> <a href="mailto:${encodeURIComponent(safeEmail)}" style="color: #428177; text-decoration: none;">${escapeHtml(safeEmail)}</a></p>` : ""}
            ${safePhone ? `<p style="margin: 10px 0;"><strong>رقم الهاتف:</strong> ${escapeHtml(safePhone)}</p>` : ""}
            <p style="margin: 10px 0;"><strong>الجهة أو الشخص المشكو بحقه:</strong> ${escapeHtml(safeAgainst)}</p>
            ${safeIncidentDate ? `<p style="margin: 10px 0;"><strong>تاريخ الواقعة:</strong> ${escapeHtml(safeIncidentDate)}</p>` : ""}
            <p style="margin: 10px 0;"><strong>الموضوع:</strong> ${escapeHtml(safeSubject)}</p>
            ${attachments.length ? `<p style="margin: 10px 0;"><strong>المرفقات:</strong> ${attachments.length} صورة (مرفقة بهذا البريد)</p>` : ""}
            <div style="margin-top: 20px; padding: 15px; background-color: #fbf9f6; border-right: 4px solid #B9A779; border-radius: 4px; font-size: 15px; line-height: 1.6; color: #333333;">
              <strong>تفاصيل الشكوى:</strong><br/>
              ${escapeHtml(message).replace(/\n/g, "<br/>")}
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #888888;">
            هذه الرسالة مرسلة بشكل تلقائي عبر بوابة شكاوى مديرية الرقابة الداخلية في الموقع الرسمي لوزارة الثقافة السورية.
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (!host) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("-----------------------------------------");
      console.log("📧 Oversight Complaint Email Sent (Test Mode)");
      console.log(`Recipient: ${toEmail}`);
      console.log(`Anonymous: ${isAnonymous}`);
      console.log(`Preview URL: ${previewUrl}`);
      console.log("-----------------------------------------");
    }

    // Best-effort acknowledgement — ONLY for non-anonymous complaints that
    // supplied an email. Deliberately generic: it must NOT echo the complaint
    // subject, the accused party, or any details, so the confirmation reveals
    // nothing sensitive if the mailbox is later seen by someone else.
    if (!isAnonymous && safeEmail) {
      sendCitizenAck({
        to: safeEmail,
        name: safeName,
        serviceLabel: "شكوى لدى مديرية الرقابة الداخلية",
        directorate: "مديرية الرقابة الداخلية",
        // The serial is a tracking handle, not complaint content — safe to
        // include without breaking the "reveal no details" rule above.
        reference: referenceNo,
        extraNote: "ستتم دراسة شكواك بسرّية تامة من قِبل الجهة المختصة.",
      });
    }

    // Returned so the success screen can show the number — for an anonymous
    // complainant, who receives no email, this is the ONLY copy they will get.
    return NextResponse.json({ success: true, referenceNo });
  } catch (error) {
    console.error("Error sending oversight complaint email:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الشكوى، يرجى المحاولة لاحقاً" },
      { status: 500 }
    );
  }
}
