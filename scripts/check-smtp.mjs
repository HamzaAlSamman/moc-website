import { validateSmtpTestRecipient } from "./check-smtp-core.mjs";

const recipient = validateSmtpTestRecipient(process.env.SMTP_TEST_TO);
const { sendMail, wrapMinistryEmail } = await import("../src/lib/mailer.js");

const sentAt = new Date().toISOString();
const info = await sendMail({
  to: recipient,
  subject: `MOC SMTP deployment check — ${sentAt}`,
  text: `Ministry website SMTP check succeeded at ${sentAt}.`,
  html: wrapMinistryEmail({
    directorate: "Website operations",
    titleAr: "اختبار بريد موقع وزارة الثقافة",
    contentHtml: `<p>نجح اختبار إعدادات البريد الصادر للموقع.</p><p dir="ltr">Sent at: ${sentAt}</p>`,
  }),
});

console.log(JSON.stringify({
  ok: true,
  recipient,
  messageId: info?.messageId ?? null,
  accepted: info?.accepted ?? [],
  rejected: info?.rejected ?? [],
}, null, 2));
