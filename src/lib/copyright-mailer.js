import "server-only";
import { sendMailQueued } from "@/lib/queued-mail";
import { generateReceiptPdf } from "@/lib/receipt-pdf";
import { formatFee, getFeesForRole } from "@/lib/copyright-fees.mjs";

// ── Fee mapping helpers ──────────────────────────────────────────────────────
// المبالغ تأتي من مصدر الرسوم الموحّد، وتُنسّق هنا فقط للعرض داخل البريد.
function getFeesForMailer(role) {
  const fees = getFeesForRole(role);
  return {
    initialTotal: formatFee(fees.initialTotal),
    finalTotal: formatFee(fees.finalTotal),
  };
}

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

// Every copyright email funnels through here, which is what makes it the one
// place that had to change for this whole service to become auditable. It used
// to drive a private nodemailer transport — a second copy of the SMTP config
// that bypassed even the shared `sendMail`, so a failed receipt left no trace
// anywhere. Now it queues like everything else; `sendMailQueued` does not
// throw, so the caller still cannot be broken by mail.
async function dispatchEmail(submission, { subject, titleAr, contentHtml, attachments = [] }) {
  if (!submission.applicantEmail) return;
  const from = process.env.SMTP_FROM || "no-reply@moc.gov.sy";
  await sendMailQueued({
    from: `"مديرية الشؤون القانونية" <${from}>`,
    to: submission.applicantEmail,
    subject,
    attachments,
    html: wrapEmailBody(titleAr, contentHtml),
    kindAr: "حقوق المؤلف",
    contextAr: submission.referenceNo || submission.workTitle || undefined,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL 1 — تأكيد استلام الطلب (يُرسل فور إتمام التسجيل بنجاح)
// يشرح للمواطن الرسوم الكاملة منذ البداية ويعطيه رمز التتبع.
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendCopyrightEmail(submission) {
  const fees = getFeesForMailer(submission.applicantRole);
  await dispatchEmail(submission, {
    subject: `تأكيد استلام طلب حماية حقوق المؤلف - المعاملة #${submission.id}`,
    titleAr: "تم استلام طلبك بنجاح — حماية حقوق المؤلف",
    contentHtml: `
      <p style="font-size: 14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم استلام طلبك لحماية العمل الفكري <strong>«${esc(submission.workTitle)}»</strong>
        (${esc(categoryLabelAr(submission.workCategory))}) وتسجيله في سجلات وزارة الثقافة.
        سيتولى الدارس المختص مراجعته فنياً وقانونياً وستصلك إشعارات عبر بريدك عند تحديث حالة طلبك.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;background:#fdfdfd;border:1px solid #f0f0f0;border-radius:8px;">
        ${submission.referenceNo ? `
        <tr style="background:#f9f9f9;border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;width:45%;">الرقم المتسلسل / Reference No.:</td>
          <td style="padding:11px 12px;font-family:monospace;font-weight:bold;color:#428177;letter-spacing:1px;">${esc(submission.referenceNo)}</td>
        </tr>` : ""}
        <tr style="background:#f9f9f9;border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;width:45%;">رمز المعاملة / Request ID:</td>
          <td style="padding:11px 12px;font-family:monospace;font-weight:bold;color:#428177;">${submission.id}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;">عنوان المصنف / Work Title:</td>
          <td style="padding:11px 12px;">${esc(submission.workTitle)}</td>
        </tr>
        <tr style="background:#f9f9f9;border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;">التصنيف / Category:</td>
          <td style="padding:11px 12px;">${esc(categoryLabelAr(submission.workCategory))}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:11px 12px;font-weight:bold;color:#002723;">مركز الإيداع / Center:</td>
          <td style="padding:11px 12px;">${esc(submission.province)} - ${esc(submission.center)}</td>
        </tr>
      </table>

      <!-- جدول الرسوم المتوقعة من البداية -->
      <div style="background:#fbf9f6;border-right:4px solid #B9A779;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #f0eada;">
        <h4 style="color:#002723;margin:0 0 12px 0;font-size:15px;border-bottom:1px dashed #e4d7be;padding-bottom:6px;">هيكل الرسوم الكاملة / Fee Structure</h4>
        <table style="width:100%;font-size:13px;line-height:2;">
          <tr>
            <td>🔹 الرسم الأولي (إيداع وحماية المصنف + طوابع):</td>
            <td style="text-align:left;font-weight:bold;color:#002723;">${fees.initialTotal}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:12px;padding-right:16px;">يُسدَّد عبر إحدى بوابات الدفع الإلكتروني المعتمدة فور استلام هذا الإشعار</td>
            <td></td>
          </tr>
          <tr style="border-top:1px dashed #e4d7be;">
            <td>🔸 الرسم النهائي (إصدار شهادة حماية حقوق المؤلف):</td>
            <td style="text-align:left;font-weight:bold;color:#002723;">${fees.finalTotal}</td>
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
// EMAIL 1.5 — إشعار «الدفع قيد التدقيق» (يُرسل فور تسديد المواطن الرسم الأولي أو
// النهائي، قبل تأكيد المالية). يطمئن المواطن أن دفعته سُجّلت وأن الإيصال الرسمي
// سيصله بعد اعتماد المالية.
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendPaymentUnderReviewEmail(submission, stage = "initial") {
  const fees = getFeesForMailer(submission.applicantRole);
  const isFinal = stage === "final";
  const feeLabel = isFinal ? "الرسم النهائي" : "الرسم الأولي";
  const feeValue = isFinal ? fees.finalTotal : fees.initialTotal;
  await dispatchEmail(submission, {
    subject: `تم استلام دفعتك (${feeLabel}) وهي قيد التدقيق - المعاملة #${submission.id}`,
    titleAr: "تم استلام دفعتك — قيد التدقيق لدى مديرية الشؤون المالية",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم استلام إشعار دفعك لـ<strong>${feeLabel}</strong> (${feeValue}) الخاص بطلبك للعمل
        <strong>«${esc(submission.workTitle)}»</strong>، وهو الآن <strong>قيد التدقيق</strong>
        لدى مديرية الشؤون المالية.
      </p>
      <div style="margin-top:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;font-size:13px;color:#1e3a8a;line-height:1.7;">
        📌 بعد اعتماد الدفع من قِبل المالية، ستصلك رسالة تحتوي على <strong>إيصال الدفع الرسمي</strong> بصيغة PDF${isFinal ? " مع شهادة حماية حقوق المؤلف" : ""}.
      </div>
      ${trackingButton(submission)}
    `,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL 2 — إيصال الرسم الأولي (يُرسل عند تأكيد المالية للرسم الأولي → under_review)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendUnderReviewEmail(submission) {
  const fees = getFeesForMailer(submission.applicantRole);
  const attachments = await buildReceiptAttachment(submission, "initial");
  await dispatchEmail(submission, {
    subject: `إيصال دفع الرسم الأولي (${fees.initialTotal}) - المعاملة #${submission.id}`,
    titleAr: "تأكيد استلام الرسم الأولي — بدء الدراسة الفنية والقانونية",
    attachments,
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم تدقيق واعتماد الرسم الأولي (${fees.initialTotal}) الخاص بطلبك للعمل
        <strong>«${esc(submission.workTitle)}»</strong> من قِبل مديرية الشؤون المالية.
        بدأت مديرية الدراسات بمراجعة طلبك فنياً وقانونياً.
      </p>
      ${receiptNotice(attachments)}
      <div style="margin-top:18px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px;font-size:12px;color:#92400e;line-height:1.6;">
        ⏳ ستتلقى إشعاراً فور صدور الموافقة النهائية لتكملة الإجراءات وتسديد الرسم الأخير (${fees.finalTotal}).
      </div>
      ${trackingButton(submission)}
    `,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL 3 — طلب تسديد الرسم النهائي (يُرسل عند pending_fees — موافقة نهائية)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendApprovalEmail(submission) {
  const fees = getFeesForMailer(submission.applicantRole);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moc.gov.sy";
  const trackingLink = `${appUrl}/ar/services/copyright?code=${submission.id}`;
  await dispatchEmail(submission, {
    subject: `تمت الموافقة على طلبك — يرجى تسديد الرسم النهائي (${fees.finalTotal}) - #${submission.id}`,
    titleAr: "🎉 تمت الموافقة القانونية على طلبك — استكمل الرسم النهائي",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        بناءً على مراجعة مديرية الشؤون القانونية بوزارة الثقافة، فقد تم اعتماد
        طلب حماية العمل الفكري <strong>«${esc(submission.workTitle)}»</strong>
        بشكل نهائي من الناحيتين القانونية والفنية.
      </p>

      <div style="background:#fbf9f6;border-right:4px solid #B9A779;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #f0eada;">
        <h4 style="color:#002723;margin:0 0 10px 0;font-size:15px;border-bottom:1px dashed #e4d7be;padding-bottom:6px;">الرسم النهائي المستحق / Final Fee Due</h4>
        <div style="font-size:28px;font-weight:bold;color:#15803d;text-align:center;margin:14px 0;">${fees.finalTotal}</div>
        <p style="font-size:12px;color:#555;margin:0;text-align:center;">
          رسم إصدار شهادة حماية حقوق المؤلف الرسمية
        </p>
      </div>

      <p style="font-size:13px;color:#444;line-height:1.7;">
        لإصدار الشهادة الرسمية وحفظها في المستودع الإلكتروني للوزارة، يرجى سداد الرسم النهائي البالغ
        <strong>${fees.finalTotal}</strong> عبر إحدى بوابات الدفع الإلكتروني المعتمدة من صفحة تتبع الطلب (الزر أدناه)،
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
  if (submission.centerDeliveryMethod === "paper") {
    return sendCompletedPaperEmail(submission);
  }

  const fees = getFeesForMailer(submission.applicantRole);
  const attachments = await buildReceiptAttachment(submission, "final");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moc.gov.sy";
  const trackingLink = `${appUrl}/ar/services/copyright?code=${submission.id}`;

  await dispatchEmail(submission, {
    subject: `🎓 صدرت شهادة حماية حقوق المؤلف — إيصال الرسم النهائي - #${submission.id}`,
    titleAr: "تهانينا! صدرت شهادة حماية حقوق المؤلف الرسمية",
    attachments,
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم تدقيق واعتماد الرسم النهائي (${fees.finalTotal}) وإصدار
        <strong>شهادة حماية حقوق المؤلف الرسمية</strong>
        للعمل <strong>«${esc(submission.workTitle)}»</strong> بصيغة قابلة للتحميل.
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

// Paper handoff already happened in person at the cultural center — no PDF
// attached here, just a confirmation the citizen can keep for their records.
async function sendCompletedPaperEmail(submission) {
  const fees = getFeesForMailer(submission.applicantRole);

  await dispatchEmail(submission, {
    subject: `🎓 استُلمت شهادة حماية حقوق المؤلف — #${submission.id}`,
    titleAr: "تهانينا! استُلمت شهادة حماية حقوق المؤلف الرسمية",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم تدقيق واعتماد الرسم النهائي (${fees.finalTotal})، وصدرت
        <strong>شهادة حماية حقوق المؤلف الرسمية</strong>
        للعمل <strong>«${esc(submission.workTitle)}»</strong> وسُلّمت نسخة ورقية منها من المركز الثقافي المعتمد.
      </p>

      <div style="margin-top:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:13px;font-size:12px;color:#1e3a8a;line-height:1.6;">
        📌 احتفظ بالشهادة الورقية كوثيقة رسمية. رقم المعاملة:
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

export async function sendPaymentCorrectionEmail(submission) {
  const origin = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://moc.gov.sy";
  const link = `${origin}/ar/services/copyright?code=${encodeURIComponent(submission.id)}`;
  await dispatchEmail(submission, {
    subject: `يرجى تصحيح بيانات الدفع - المعاملة #${submission.id}`,
    titleAr: "إعادة الدفع للتصحيح",
    contentHtml: `<p>عزيزنا ${esc(submission.applicantName)}، يرجى تصحيح بيانات الحوالة الخاصة بالمصنف «${esc(submission.workTitle)}» وإرسالها مجدداً للتدقيق.</p>${applicantNoteBox(submission.deficiencyNote, { heading: "سبب الإرجاع:" })}<p><a href="${esc(link)}">فتح المعاملة وتصحيح الدفع</a></p>`,
  });
}

// Escape applicant/reviewer-supplied text before interpolating into email HTML.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Renders a highlighted box containing a free-text message the reviewer wrote
// to the citizen (the list of deficiencies, or the reason for rejection).
function applicantNoteBox(note, { heading, tone = "warn" }) {
  if (!note || !String(note).trim()) return "";
  const palette = tone === "reject"
    ? { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" }
    : { bg: "#fefce8", border: "#fde68a", color: "#92400e" };
  const safe = esc(note).replace(/\n/g, "<br/>");
  return `
    <div style="margin:20px 0;background:${palette.bg};border:1px solid ${palette.border};border-radius:8px;padding:16px;">
      <h4 style="margin:0 0 8px 0;font-size:14px;color:${palette.color};">${heading}</h4>
      <p style="margin:0;font-size:13px;color:${palette.color};line-height:1.8;white-space:pre-line;">${safe}</p>
    </div>
  `;
}

// suspended — يتلقى المواطن إشعار النواقص مع تفاصيلها المكتوبة من المدقّق.
export async function sendSuspendedEmail(submission) {
  await dispatchEmail(submission, {
    subject: `طلبك متوقف مؤقتاً لاستكمال النواقص - المعاملة #${submission.id}`,
    titleAr: "⚠️ طلبك متوقف مؤقتاً — يرجى استكمال المستندات الناقصة",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم إيقاف طلبك الخاص بالعمل <strong>«${esc(submission.workTitle)}»</strong>
        مؤقتاً لوجود النواقص التالية:
      </p>
      ${applicantNoteBox(submission.deficiencyNote, { heading: "📋 النواقص المطلوب استكمالها:", tone: "warn" })}
      <p style="font-size:13px;color:#444;line-height:1.7;">
        يرجى الدخول لصفحة تتبع الطلب، إعادة رفع المستندات الناقصة وكتابة ردّك، ثم إعادة إرسال الطلب.
      </p>
      ${trackingButton(submission)}
    `,
  });
}

// rejected — يتلقى المواطن إشعار الرفض مع سببه المكتوب.
export async function sendRejectedEmail(submission) {
  await dispatchEmail(submission, {
    subject: `نتيجة طلب حماية حقوق المؤلف - المعاملة #${submission.id}`,
    titleAr: "إشعار: تم رفض طلب حماية حقوق المؤلف",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        نأسف لإعلامك بأنه تم رفض طلبك الخاص بالعمل
        <strong>«${esc(submission.workTitle)}»</strong> بشكل نهائي بعد المراجعة.
      </p>
      ${applicantNoteBox(submission.deficiencyNote, { heading: "سبب الرفض:", tone: "reject" })}
      <p style="font-size:13px;color:#444;line-height:1.7;">
        يمكنك مراجعة صفحة تتبع الطلب أو التواصل مع مديرية الشؤون القانونية لمزيد من التفاصيل.
      </p>
      ${trackingButton(submission)}
    `,
  });
}
