import "server-only";
import nodemailer from "nodemailer";
import { generateReceiptPdf } from "@/lib/receipt-pdf";

// ── Label helpers ─────────────────────────────────────────────────────────────
const WORK_CATEGORY_LABELS_AR = {
  written: "نصوص مكتوبة",
  informational: "برمجيات وتطبيقات",
  audio_visual: "صوتيات أو مرئيات",
  fine_arts: "فنون تشكيلية وتصميم",
  folklore: "مأثورات وتراث شعبي",
};
function categoryLabelAr(cat) {
  return WORK_CATEGORY_LABELS_AR[cat] || cat;
}

// ── SMTP transport ────────────────────────────────────────────────────────────
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
    });
  }
  return null;
}

async function getTransport() {
  const transporter = buildTransport();
  if (transporter) return { transporter, isDev: false };
  // In production we must NEVER silently route a citizen's confirmation/receipt
  // to a throwaway ethereal.email inbox — it would vanish and the applicant
  // would think their submission never went through (exactly this bug). Fail
  // loudly so the SMTP misconfiguration is caught instead of hidden.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SMTP_HOST/SMTP_USER/SMTP_PASS are not configured — copyright email not sent.",
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

// ── Shared layout ─────────────────────────────────────────────────────────────
function wrapEmailBody(titleAr, contentHtml) {
  return `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #fcfcfc; border: 1px solid #eaeaea; border-radius: 12px; max-width: 650px; margin: 0 auto;">
      <div style="background-color: #002723; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; border-bottom: 3px solid #B9A779;">
        <h2 style="color: #ffffff; margin: 0; font-size: 22px;">الجمهورية العربية السورية</h2>
        <h3 style="color: #B9A779; margin: 5px 0 0 0; font-size: 15px;">وزارة الثقافة - مديرية الشؤون القانونية</h3>
      </div>
      <div style="padding: 24px; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff; color: #333333; line-height: 1.6;">
        <h3 style="color: #002723; border-bottom: 2px solid #B9A779; padding-bottom: 8px; margin-top: 0; font-size: 18px;">${titleAr}</h3>
        ${contentHtml}
      </div>
      <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #888888; border-top: 1px solid #eee; padding-top: 15px;">
        وزارة الثقافة السورية - مديرية الشؤون القانونية. هذه الرسالة مرسلة بشكل تلقائي.
      </div>
    </div>
  `;
}

function trackingButton(submission) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moc.gov.sy";
  const trackingLink = `${appUrl}/ar/services/copyright?code=${submission.id}`;
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${trackingLink}" style="background-color: #002723; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: bold; border-bottom: 3px solid #B9A779; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;">
        تتبع حالة الطلب / Track Request Status
      </a>
    </div>
  `;
}

function receiptNotice(attachments) {
  if (!attachments || attachments.length === 0) return "";
  return `
    <div style="margin-top: 22px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; font-size: 13px; color: #166534; text-align: center; line-height: 1.6;">
      📎 تجد إيصال الدفع الرسمي مرفقاً بهذه الرسالة بصيغة PDF — يمكنك تحميله والاحتفاظ به.<br/>
      <span style="font-size: 11px; color: #15803d;">Your official payment receipt is attached as a PDF.</span>
    </div>
  `;
}

async function buildReceiptAttachment(submission, stage) {
  try {
    const pdf = await generateReceiptPdf(submission, { stage });
    const tag = stage === "final" ? "final" : "initial";
    return [
      {
        filename: `MOC-receipt-${submission.id}-${tag}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ];
  } catch (err) {
    console.error(`Failed to generate ${stage} receipt PDF for ${submission.id}:`, err);
    return [];
  }
}

async function dispatchEmail(submission, { subject, titleAr, contentHtml, attachments = [] }) {
  if (!submission.applicantEmail) return;
  try {
    const from = process.env.SMTP_FROM || "no-reply@moc.gov.sy";
    const { transporter, isDev } = await getTransport();
    const info = await transporter.sendMail({
      from: `"مديرية الشؤون القانونية" <${from}>`,
      to: submission.applicantEmail,
      subject,
      attachments,
      html: wrapEmailBody(titleAr, contentHtml),
    });
    if (isDev) {
      console.log("-----------------------------------------");
      console.log(`📧 Ethereal Email Sent (${subject})`);
      console.log(`Recipient: ${submission.applicantEmail}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      console.log("-----------------------------------------");
    }
  } catch (error) {
    console.error(`Error sending copyright email (${subject}):`, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL 1 — تأكيد استلام الطلب (يُرسل فور إتمام التسجيل بنجاح)
// يشرح للمواطن الرسوم الكاملة منذ البداية ويعطيه رمز التتبع.
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendCopyrightEmail(submission) {
  await dispatchEmail(submission, {
    subject: `تأكيد استلام طلب حماية حقوق المؤلف - المعاملة #${submission.id}`,
    titleAr: "تم استلام طلبك بنجاح — حماية حقوق المؤلف",
    contentHtml: `
      <p style="font-size: 14px;">
        عزيزنا المودع <strong>${submission.applicantName}</strong>،<br/>
        تم استلام طلبك لحماية العمل الفكري <strong>«${submission.workTitle}»</strong>
        (${categoryLabelAr(submission.workCategory)}) وتسجيله في سجلات وزارة الثقافة.
        سيتولى الدارس المختص مراجعته فنياً وقانونياً وستصلك إشعارات عبر بريدك في المراحل الأساسية فقط.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;background:#fdfdfd;border:1px solid #f0f0f0;border-radius:8px;">
        <tr style="background:#f9f9f9;border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;width:45%;">رمز المعاملة / Request ID:</td>
          <td style="padding:11px 12px;font-family:monospace;font-weight:bold;color:#428177;">${submission.id}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;">عنوان المصنف / Work Title:</td>
          <td style="padding:11px 12px;">${submission.workTitle}</td>
        </tr>
        <tr style="background:#f9f9f9;border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;">التصنيف / Category:</td>
          <td style="padding:11px 12px;">${categoryLabelAr(submission.workCategory)}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;">مركز الإيداع / Center:</td>
          <td style="padding:11px 12px;">${submission.province} - ${submission.center}</td>
        </tr>
      </table>

      <!-- جدول الرسوم المتوقعة من البداية -->
      <div style="background:#fbf9f6;border-right:4px solid #B9A779;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #f0eada;">
        <h4 style="color:#002723;margin:0 0 12px 0;font-size:15px;border-bottom:1px dashed #e4d7be;padding-bottom:6px;">هيكل الرسوم الكاملة / Fee Structure</h4>
        <table style="width:100%;font-size:13px;line-height:2;">
          <tr>
            <td>🔹 الرسم الأولي (إيداع وحماية المصنف + طوابع):</td>
            <td style="text-align:left;font-weight:bold;color:#002723;">550 ل.س</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding-right:16px;">يُسدَّد عبر شام كاش فور استلام هذا الإشعار</td>
            <td></td>
          </tr>
          <tr style="border-top:1px dashed #e4d7be;">
            <td>🔸 الرسم النهائي (إصدار شهادة حماية حقوق المؤلف):</td>
            <td style="text-align:left;font-weight:bold;color:#002723;">500 ل.س</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding-right:16px;">يُطلب منك تسديده فقط بعد الحصول على الموافقة القانونية النهائية</td>
            <td></td>
          </tr>
        </table>
      </div>

      <div style="margin-top:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;font-size:12px;color:#1e3a8a;line-height:1.6;">
        📌 احتفظ برمز المعاملة أعلاه لتتبع طلبك وتسديد الرسوم عبر صفحة «متابعة طلب سابق».
      </div>

      ${trackingButton(submission)}
    `,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL 2 — إيصال الرسم الأولي (يُرسل عند تأكيد المالية للرسم الأولي → under_review)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendUnderReviewEmail(submission) {
  const attachments = await buildReceiptAttachment(submission, "initial");
  await dispatchEmail(submission, {
    subject: `إيصال دفع الرسم الأولي (550 ل.س) - المعاملة #${submission.id}`,
    titleAr: "تأكيد استلام الرسم الأولي — بدء الدراسة الفنية والقانونية",
    attachments,
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${submission.applicantName}</strong>،<br/>
        تم تدقيق واعتماد الرسم الأولي (550 ل.س) الخاص بطلبك للعمل
        <strong>«${submission.workTitle}»</strong> من قِبل مديرية الشؤون المالية.
        بدأت مديرية الدراسات بمراجعة طلبك فنياً وقانونياً.
      </p>
      ${receiptNotice(attachments)}
      <div style="margin-top:18px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px;font-size:12px;color:#92400e;line-height:1.6;">
        ⏳ ستتلقى إشعاراً فور صدور الموافقة النهائية لتكملة الإجراءات وتسديد الرسم الأخير (500 ل.س).
      </div>
      ${trackingButton(submission)}
    `,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL 3 — طلب تسديد الرسم النهائي (يُرسل عند pending_fees — موافقة نهائية)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendApprovalEmail(submission) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moc.gov.sy";
  const trackingLink = `${appUrl}/ar/services/copyright?code=${submission.id}`;
  await dispatchEmail(submission, {
    subject: `تمت الموافقة على طلبك — يرجى تسديد الرسم النهائي (500 ل.س) - #${submission.id}`,
    titleAr: "🎉 تمت الموافقة القانونية على طلبك — استكمل الرسم النهائي",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${submission.applicantName}</strong>،<br/>
        يسعدنا إعلامك بأن طلب حماية العمل الفكري
        <strong>«${submission.workTitle}»</strong>
        قد حاز على <strong>الموافقة القانونية والفنية النهائية</strong>
        من مديرية الشؤون القانونية بوزارة الثقافة.
      </p>

      <div style="background:#fbf9f6;border-right:4px solid #B9A779;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #f0eada;">
        <h4 style="color:#002723;margin:0 0 10px 0;font-size:15px;border-bottom:1px dashed #e4d7be;padding-bottom:6px;">الرسم النهائي المستحق / Final Fee Due</h4>
        <div style="font-size:28px;font-weight:bold;color:#15803d;text-align:center;margin:14px 0;">500 ل.س</div>
        <p style="font-size:12px;color:#555;margin:0;text-align:center;">
          رسم إصدار شهادة حماية حقوق المؤلف الرسمية
        </p>
      </div>

      <p style="font-size:13px;color:#444;line-height:1.7;">
        لإصدار الشهادة الرسمية وحفظها في المستودع الإلكتروني للوزارة، يرجى سداد الرسم النهائي البالغ
        <strong>500 ل.س</strong> عبر شام كاش من صفحة تتبع الطلب (الزر أدناه)،
        ثم رفع صورة إيصال الدفع في الحقل المخصص.
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${trackingLink}"
           style="background-color:#002723;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:bold;border-bottom:3px solid #B9A779;box-shadow:0 4px 6px rgba(0,0,0,0.1);display:inline-block;">
          الانتقال للتتبع وتسديد الرسم النهائي
        </a>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:13px;font-size:12px;color:#166534;line-height:1.6;text-align:center;">
        ✅ بعد تأكيد الدفع من قِبل المالية، ستُصدر شهادتك الرسمية وستتلقى إشعاراً بذلك مع رابط التحميل.
      </div>
    `,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL 4 — إيصال الرسم النهائي + إشعار إصدار الشهادة (يُرسل عند completed)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendCompletedEmail(submission) {
  const attachments = await buildReceiptAttachment(submission, "final");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moc.gov.sy";
  const trackingLink = `${appUrl}/ar/services/copyright?code=${submission.id}`;

  await dispatchEmail(submission, {
    subject: `🎓 صدرت شهادة حماية حقوق المؤلف — إيصال الرسم النهائي - #${submission.id}`,
    titleAr: "تهانينا! صدرت شهادة حماية حقوق المؤلف الرسمية",
    attachments,
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${submission.applicantName}</strong>،<br/>
        تم تدقيق واعتماد الرسم النهائي (500 ل.س) وإصدار
        <strong>شهادة حماية حقوق المؤلف الرسمية</strong>
        للعمل <strong>«${submission.workTitle}»</strong> بصيغة قابلة للتحميل.
      </p>

      ${receiptNotice(attachments)}

      <div style="margin-top:20px;background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">🏅</div>
        <h4 style="color:#15803d;margin:0 0 8px 0;font-size:16px;">شهادتك الرسمية جاهزة للتحميل</h4>
        <p style="font-size:12px;color:#166534;margin:0 0 16px 0;">
          يمكنك تحميل شهادة حماية حقوق المؤلف بصيغة PDF من خلال صفحة تتبع الطلب
        </p>
        <a href="${trackingLink}"
           style="background-color:#15803d;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block;">
          تحميل الشهادة الرسمية (PDF)
        </a>
      </div>

      <div style="margin-top:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:13px;font-size:12px;color:#1e3a8a;line-height:1.6;">
        📌 احتفظ بهذه الرسالة وإيصال الدفع المرفق كوثائق رسمية. رقم المعاملة:
        <strong style="font-family:monospace;">${submission.id}</strong>
      </div>
    `,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAILS الثانوية — لا تُرسل للمواطن بل تكتفي بإشعار الطاقم الداخلي.
// نُبقي على هذه الدوال لاستخدامها في admin route ولكن نجعلها صامتة تجاه المواطن
// (لا تُرسل له إيميلاً لأنه لا حاجة للإخبار بكل خطوة داخلية).
// ═══════════════════════════════════════════════════════════════════════════════

// pending_final_approval — خطوة داخلية لا تحتاج بريداً للمواطن.
export async function sendPendingFinalApprovalEmail(_submission) {
  // صامتة — المواطن لا يحتاج أن يعرف أن الملف وصل لمعاون الوزير.
  // الإشعار الداخلي يُرسل عبر notify.js في admin route.
}

// suspended — يتلقى المواطن إشعار النواقص.
export async function sendSuspendedEmail(submission) {
  await dispatchEmail(submission, {
    subject: `طلبك متوقف مؤقتاً لاستكمال النواقص - المعاملة #${submission.id}`,
    titleAr: "⚠️ طلبك متوقف مؤقتاً — يرجى استكمال المستندات الناقصة",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${submission.applicantName}</strong>،<br/>
        تم إيقاف طلبك الخاص بالعمل <strong>«${submission.workTitle}»</strong>
        مؤقتاً لوجود نواقص في المستندات. يرجى الدخول لصفحة تتبع الطلب لمعرفة
        التفاصيل وإعادة رفع المستندات المطلوبة.
      </p>
      ${trackingButton(submission)}
    `,
  });
}

// rejected — يتلقى المواطن إشعار الرفض.
export async function sendRejectedEmail(submission) {
  await dispatchEmail(submission, {
    subject: `نتيجة طلب حماية حقوق المؤلف - المعاملة #${submission.id}`,
    titleAr: "إشعار: تم رفض طلب حماية حقوق المؤلف",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${submission.applicantName}</strong>،<br/>
        نأسف لإعلامك بأنه تم رفض طلبك الخاص بالعمل
        <strong>«${submission.workTitle}»</strong> بعد المراجعة.
        يمكنك مراجعة صفحة تتبع الطلب أو التواصل مع مديرية الشؤون القانونية لمزيد من التفاصيل.
      </p>
      ${trackingButton(submission)}
    `,
  });
}
