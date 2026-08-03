function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function arabicDuration(ttlSeconds) {
  const minutes = Math.max(1, Math.ceil(ttlSeconds / 60));
  if (minutes === 1) return "دقيقة واحدة";
  if (minutes === 2) return "دقيقتين";
  if (minutes >= 3 && minutes <= 10) return `${minutes} دقائق`;
  return `${minutes} دقيقة`;
}

export function createCitizenMailer({ sendMail, wrapMinistryEmail }) {
  if (typeof sendMail !== "function" || typeof wrapMinistryEmail !== "function") {
    throw new TypeError("Citizen mailer requires sendMail and wrapMinistryEmail");
  }

  return Object.freeze({
    async sendCitizenOtpEmail({ to, code, ttlSeconds, fullName = "" }) {
      if (!/^\d{6}$/.test(code)) {
        throw new TypeError("OTP code must contain exactly six digits");
      }

      const greeting = fullName
        ? `<p>مرحباً ${escapeHtml(fullName)}،</p>`
        : "<p>مرحباً،</p>";
      const contentHtml = `
        ${greeting}
        <p>رمز تفعيل حسابك في منصة وزارة الثقافة هو:</p>
        <p dir="ltr" style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; color: #002723;">${code}</p>
        <p>الرمز صالح لمدة ${arabicDuration(ttlSeconds)} ولا تشاركه مع أي شخص.</p>
        <p>إذا لم تطلب إنشاء الحساب، تجاهل هذه الرسالة.</p>
      `;

      return sendMail({
        to,
        subject: "رمز تفعيل حسابك في منصة وزارة الثقافة",
        html: wrapMinistryEmail({
          directorate: "منصة الخدمات الإلكترونية",
          titleAr: "تفعيل البريد الإلكتروني",
          contentHtml,
        }),
      });
    },
  });
}
