import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendCitizenAck } from "@/lib/queued-mail";
import { notifyByPermission } from "@/lib/notify";
import { nextReferenceNumberSafe, REFERENCE_SCOPES } from "@/lib/reference-number";
import { ltrIsolate } from "@/lib/bidi.mjs";
import {
  complaintStorageKey,
  validateComplaintImage,
  writeComplaintFile,
} from "@/lib/complaint-storage.mjs";

// Contact channel for the Directorate of International Cooperation. Like the
// general /api/contact endpoint this carries a few extra fields (workplace,
// phone, contact type) and routes to the directorate's own inbox rather than
// the ministry's general one.
//
// Every message is persisted to `CooperationMessage` FIRST, then mailed to
// the directorate inbox as a best-effort convenience notification. Mail
// delivery failing (or SMTP being unconfigured) no longer loses the
// message — it stays reviewable at /admin/cooperation-messages.

const STORAGE_SUBDIR = "cooperation-messages";

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

const MAX_IMAGES = 5;

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

    // Optional supporting images. Magic-byte validated (like every other
    // upload path in this app) so a mislabeled file can't slip through.
    // Kept in memory as mail attachments AND written to private storage once
    // the DB row exists, so admins can review them even if mail never sends.
    const pendingImages = [];
    if (Array.isArray(body.images)) {
      for (const img of body.images.slice(0, MAX_IMAGES)) {
        const dataUrl = typeof img?.dataUrl === "string" ? img.dataUrl : "";
        const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) continue;
        const buffer = Buffer.from(match[2], "base64");
        let validated;
        try {
          validated = validateComplaintImage({ bytes: buffer, declaredMimeType: match[1] });
        } catch {
          continue;
        }
        const safeImgName = cleanHeaderValue(img?.name || "").replace(/[^\w.\-؀-ۿ ]/g, "").slice(0, 80);
        pendingImages.push({
          filename: safeImgName || `attachment_${pendingImages.length + 1}`,
          mimeType: validated.mimeType,
          buffer,
        });
      }
    }

    const safeName = cleanHeaderValue(name);
    const safeEmail = cleanHeaderValue(email);
    const safePhone = cleanHeaderValue(phone);
    const safeWorkplace = cleanHeaderValue(workplace);
    const safeSubject = cleanHeaderValue(subject);
    const typeAr = CONTACT_TYPES[contactType].ar;

    // Sequential reference (COP-YYYY-NNNN): this channel was email-only before,
    // so the number is the applicant's only handle on their request.
    const referenceNo = await nextReferenceNumberSafe(REFERENCE_SCOPES.COOPERATION);

    // Persist FIRST — the message must survive even if mail delivery below
    // fails or SMTP is unconfigured.
    const cooperationMessage = await prisma.cooperationMessage.create({
      data: {
        referenceNo,
        contactType,
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        workplace: safeWorkplace,
        subject: safeSubject,
        message,
      },
    });

    // Best-effort: write validated images to private storage and record them.
    // A storage failure must not lose the message text itself.
    const attachments = [];
    for (const image of pendingImages) {
      try {
        const storageKey = complaintStorageKey(cooperationMessage.id, image.mimeType);
        await writeComplaintFile(STORAGE_SUBDIR, storageKey, image.buffer);
        attachments.push({
          filename: image.filename,
          mimeType: image.mimeType,
          size: image.buffer.length,
          storageKey,
        });
      } catch (err) {
        console.error("Cooperation message attachment write failed:", err);
      }
    }
    if (attachments.length) {
      await prisma.cooperationMessage.update({
        where: { id: cooperationMessage.id },
        data: { attachments },
      }).catch((err) => console.error("Cooperation message attachment update failed:", err));
    }

    await notifyByPermission("REVIEW_COOPERATION_MESSAGES", {
      type: "COOPERATION_MESSAGE",
      titleAr: `رسالة تعاون دولي جديدة ${referenceNo || ""}`.trim(),
      titleEn: `New international cooperation message ${referenceNo || ""}`.trim(),
      link: `/admin/cooperation-messages/${cooperationMessage.id}`,
    });

    // Mail delivery is now a best-effort convenience notification — its
    // outcome never determines whether the citizen's submission succeeded.
    let emailSent = false;
    let emailError = null;
    try {
      const setting = await prisma.setting.findUnique({ where: { key: "cooperation_email" } });
      const toEmail = setting?.value || process.env.COOPERATION_EMAIL || "cooperation@moc.gov.sy";

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
        throw new Error("SMTP_HOST/SMTP_USER/SMTP_PASS are not configured in production");
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
      }

      const mailAttachments = pendingImages.map((image, index) => ({
        filename: image.filename || `attachment_${index + 1}`,
        content: image.buffer,
      }));

      const mailOptions = {
        from: `"التواصل مع مديرية التعاون الدولي" <${from}>`,
        to: toEmail,
        replyTo: `"${safeName}" <${safeEmail}>`,
        subject: `${referenceNo ? `[${referenceNo}] ` : ""}[${typeAr}] رسالة جديدة لمديرية التعاون الدولي: ${safeSubject}`,
        ...(mailAttachments.length ? { attachments: mailAttachments } : {}),
        text:
          (referenceNo ? `الرقم المتسلسل: ${referenceNo}\n\n` : "") +
          `نوع التواصل: ${typeAr}\n` +
          `اسم مقدم الطلب: ${safeName}\n` +
          `جهة العمل: ${safeWorkplace}\n` +
          `البريد الإلكتروني: ${safeEmail}\n` +
          `رقم الهاتف: ${ltrIsolate(safePhone)}\n` +
          `الموضوع: ${safeSubject}\n` +
          (mailAttachments.length ? `عدد المرفقات: ${mailAttachments.length}\n` : "") +
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
              <p style="margin: 10px 0;"><strong>رقم الهاتف:</strong> <span dir="ltr" style="unicode-bidi: embed;">${escapeHtml(ltrIsolate(safePhone))}</span></p>
              <p style="margin: 10px 0;"><strong>الموضوع:</strong> ${escapeHtml(safeSubject)}</p>
              ${mailAttachments.length ? `<p style="margin: 10px 0;"><strong>المرفقات:</strong> ${mailAttachments.length} صورة (مرفقة بهذا البريد)</p>` : ""}
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
      emailSent = true;

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
    } catch (mailErr) {
      console.error("Cooperation message email delivery failed (message is still saved):", mailErr);
      emailError = mailErr?.message || "unknown error";
    }

    await prisma.cooperationMessage.update({
      where: { id: cooperationMessage.id },
      data: { emailSent, emailError },
    }).catch((err) => console.error("Cooperation message email-status update failed:", err));

    return NextResponse.json({ success: true, referenceNo });
  } catch (error) {
    console.error("Error handling cooperation contact message:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً" },
      { status: 500 }
    );
  }
}
