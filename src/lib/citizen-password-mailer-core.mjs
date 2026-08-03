function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createCitizenPasswordMailer({ sendMail, wrapMinistryEmail }) {
  return Object.freeze({
    sendPasswordResetEmail({ to, fullName = "", resetUrl, ttlMinutes }) {
      const contentHtml = `
        <p>مرحباً ${escapeHtml(fullName)}،</p>
        <p>تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في منصة وزارة الثقافة.</p>
        <p style="text-align:center"><a href="${escapeHtml(resetUrl)}">إعادة تعيين كلمة المرور</a></p>
        <p>الرابط صالح لمدة ${Number(ttlMinutes)} دقيقة ويستخدم مرة واحدة فقط.</p>
        <p>إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
      `;
      return sendMail({
        to,
        subject: "إعادة تعيين كلمة المرور - وزارة الثقافة",
        html: wrapMinistryEmail({
          directorate: "منصة الخدمات الإلكترونية",
          titleAr: "إعادة تعيين كلمة المرور",
          contentHtml,
        }),
      });
    },
  });
}
