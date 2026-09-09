import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

// Read and parse .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Remove surrounding quotes if any
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const recipient = process.argv[2] || process.env.SMTP_TEST_TO;
if (!recipient) {
  console.error("Error: Please provide a recipient email address as an argument.");
  console.error("Example: node scripts/check-smtp-prod.mjs test@gmail.com");
  process.exit(1);
}

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || "no-reply@moc.gov.sy";

if (!host || !user || !pass) {
  console.error("Error: SMTP_HOST, SMTP_USER, or SMTP_PASS are not configured in your .env file.");
  process.exit(1);
}

console.log("Connecting to SMTP server...");
console.log(`Host: ${host}`);
console.log(`Port: ${port}`);
console.log(`User: ${user}`);
console.log(`From: ${from}`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  tls: { rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== "true" },
});

try {
  const info = await transporter.sendMail({
    from: `"وزارة الثقافة السورية" <${from}>`,
    to: recipient,
    subject: `MOC SMTP production check — ${new Date().toISOString()}`,
    text: "نجح اختبار إعدادات البريد الصادر للموقع من السيرفر مباشرة.",
    html: `<div style="direction:rtl; text-align:right; font-family:sans-serif; padding:20px; border:1px solid #eaeaea; border-radius:8px;">
      <h2>اختبار بريد موقع وزارة الثقافة</h2>
      <p>نجح اختبار إعدادات البريد الصادر للموقع من السيرفر مباشرة.</p>
      <p>وقت الإرسال: ${new Date().toLocaleString("ar-SY")}</p>
    </div>`
  });
  console.log("Success! Email sent successfully.");
  console.log("Message ID:", info.messageId);
  console.log("Response:", info.response);
} catch (error) {
  console.error("Failed to send email:", error);
}
