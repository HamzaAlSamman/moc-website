// The registry of copyright fee payment gateways — shared by the public
// payment screen and by the API that records a payment, so "this gateway is
// not live yet" is decided in exactly one place. Plain data with no React or
// Prisma imports, so it loads on the client, on the server and under
// `node --test` alike.
//
// `status` is the gate:
//   "active" — usable: shows an account code, accepts payments.
//   "soon"   — announced but not live: no account code is shown and the API
//              refuses payments recorded against it.
//
// Each gateway also carries its own brand palette. The colours are applied
// through inline styles rather than Tailwind classes on purpose: they are
// chosen at runtime from this data, and Tailwind's scanner cannot see class
// names assembled from variables.

const CHAM_CASH_ACCOUNT_CODE =
  process.env.NEXT_PUBLIC_CHAM_CASH_ACCOUNT_CODE || "f6be4f104cf141af079e7c2af693dd41";
const SYRIATEL_CASH_ACCOUNT_CODE =
  process.env.NEXT_PUBLIC_SYRIATEL_CASH_ACCOUNT_CODE || "0933123456";
const MTN_CASH_ACCOUNT_CODE =
  process.env.NEXT_PUBLIC_MTN_CASH_ACCOUNT_CODE || "0999123456";

// Single source of truth for the payment gateways: the selector and the
// details card both read it, so a gateway's status, colours and copy can
// never drift apart between the two. `status` is the gate — only "active"
// gateways reveal an account code and payment instructions.
//
// Each gateway carries its own brand palette. The values are applied through
// inline styles rather than Tailwind classes on purpose: the colours are
// chosen at runtime from this data, and Tailwind's scanner cannot see class
// names that are assembled from variables.
export const PAYMENT_GATEWAYS = {
    cham_cash: {
      status: "active",
      nameAr: "شام كاش",
      nameEn: "Cham Cash",
      descAr: "الدفع الإلكتروني الآمن عبر محفظة شام كاش الرقمية",
      descEn: "Pay via Cham Cash secure digital wallet",
      theme: { accent: "#3ecf8e", gradient: ["#043a30", "#02120f", "#010b09"] },
      logo: "/images/cham_cash.jpg",
      qr: "/images/cham_cash_qr.png",
      accountCode: CHAM_CASH_ACCOUNT_CODE,
      brandText: "CHAM CASH DIGITAL PAY",
      howToPayAr: "طريقة التحويل عبر تطبيق شام كاش:",
      howToPayEn: "How to transfer via Cham Cash app:",
      instructionsAr: [
        "افتح تطبيق شام كاش واختر ارسال.",
        "ألصق رمز الحساب المنسوخ أعلاه في الخانة المتاحة.",
        "أدخل مبلغ الرسم المطلوب بدقة، ثم أكّد العملية.",
        "قم بتصوير شاشة الإيصال ورفعها في الحقل المخصص أدناه."
      ],
      instructionsEn: [
        "Open Cham Cash app and select Send.",
        "Paste the Account Code copied above in the available field.",
        "Enter the required fee amount, then confirm.",
        "Take a screenshot of the receipt and upload below."
      ],
      qrTitleAr: "امسح الباركود للدفع السريع",
      qrTitleEn: "Scan to Pay Instantly",
      qrDescAr: "وجه كاميرا هاتفك المحمول أو قارئ الرمز في تطبيق شام كاش نحو الباركود لإتمام عملية الدفع بسرعة.",
      qrDescEn: "Point your phone camera or the QR scanner in Cham Cash app at the barcode to complete the payment."
    },
    syriatel_cash: {
      status: "soon",
      nameAr: "سيريتل كاش",
      nameEn: "Syriatel Cash",
      descAr: "الدفع الإلكتروني الآمن عبر محفظة سيريتل كاش",
      descEn: "Pay via Syriatel Cash mobile wallet",
      theme: { accent: "#ff5a5f", gradient: ["#3d0f11", "#170506", "#0b0203"] },
      logo: "/images/syriatel_cash.jpg",
      qr: null,
      accountCode: SYRIATEL_CASH_ACCOUNT_CODE,
      brandText: "SYRIATEL CASH MOBILE PAY",
      howToPayAr: "طريقة التحويل عبر سيريتل كاش:",
      howToPayEn: "How to transfer via Syriatel Cash:",
      instructionsAr: [
        "افتح تطبيق سيريتل كاش أو اطلب الرمز *150#.",
        "اختر خيار الدفع الإلكتروني أو تحويل الأموال.",
        "أدخل رقم الحساب أو الموزع المنسوخ أعلاه.",
        "أدخل مبلغ الرسم المطلوب بدقة، ثم أكّد العملية.",
        "قم بتصوير شاشة الإيصال ورفعها في الحقل المخصص أدناه."
      ],
      instructionsEn: [
        "Open Syriatel Cash app or dial *150#.",
        "Choose electronic payment or money transfer.",
        "Enter the account code or merchant number copied above.",
        "Enter the required fee amount, then confirm.",
        "Take a screenshot of the receipt and upload below."
      ]
    },
    mtn_cash: {
      status: "soon",
      nameAr: "ام تي ان كاش",
      nameEn: "MTN Cash",
      descAr: "الدفع الإلكتروني الآمن عبر كاش موبايل",
      descEn: "Pay via MTN Cash Mobile wallet",
      theme: { accent: "#ffcb05", gradient: ["#3b3105", "#161102", "#0a0801"] },
      logo: "/images/mtn_cash.jpg",
      qr: null,
      accountCode: MTN_CASH_ACCOUNT_CODE,
      brandText: "MTN CASH MOBILE PAY",
      howToPayAr: "طريقة التحويل عبر كاش موبايل (MTN):",
      howToPayEn: "How to transfer via Cash Mobile (MTN):",
      instructionsAr: [
        "افتح تطبيق كاش موبايل أو اطلب الرمز *2020#.",
        "اختر خيار الدفع لتاجر أو تحويل الأموال.",
        "أدخل رمز الحساب أو رقم الموزع المنسوخ أعلاه.",
        "أدخل مبلغ الرسم المطلوب بدقة، ثم أكّد العملية.",
        "قم بتصوير شاشة الإيصال ورفعها في الحقل المخصص أدناه."
      ],
      instructionsEn: [
        "Open Cash Mobile app or dial *2020#.",
        "Choose pay merchant or transfer money.",
        "Enter the account code or merchant number copied above.",
        "Enter the required fee amount, then confirm.",
        "Take a screenshot of the receipt and upload below."
      ]
    },
    // Unlike every other gateway here, Paymera is a real API integration
    // (redirect to a hosted card+OTP page, confirmed server-side via
    // get-payment-status — see src/lib/paymera.mjs) rather than "copy this
    // code, pay elsewhere, upload a screenshot". `mode: "redirect"` is how
    // the payment UI (PaymentCard in the copyright page) tells the two apart
    // — a redirect gateway has no account code to show or copy.
    paymearia: {
      status: "active",
      mode: "redirect",
      nameAr: "بيميرا",
      nameEn: "Paymeara",
      descAr: "الدفع الإلكتروني الآمن بالبطاقة المصرفية عبر بوابة بيميرا",
      descEn: "Pay by bank card via the Paymera electronic gateway",
      theme: { accent: "#a855f7", gradient: ["#2b1147", "#130725", "#090313"] },
      logo: "/images/paymearia.png",
      qr: null,
      brandText: "PAYMERA ELECTRONIC GATEWAY",
      redirectDescAr: "سيتم تحويلك إلى صفحة بيميرا الآمنة لإدخال بيانات بطاقتك المصرفية ورمز التحقق (OTP)، ثم العودة تلقائياً لإكمال معاملتك.",
      redirectDescEn: "You'll be redirected to Paymera's secure page to enter your card details and OTP, then brought back automatically to finish your transaction."
    }
};

/** Every gateway id, in display order. */
export const PAYMENT_GATEWAY_IDS = Object.keys(PAYMENT_GATEWAYS);

/**
 * True only for a gateway that is live and may take money. Unknown ids are
 * inactive: an id the registry does not recognise cannot have been offered by
 * this application.
 *
 * @param {string} id
 */
export function isPaymentGatewayActive(id) {
  return PAYMENT_GATEWAYS[id]?.status === "active";
}

/**
 * True for a gateway paid by redirecting to a hosted payment page and
 * confirmed server-side (currently only Paymera) rather than by the citizen
 * typing a transfer reference and uploading a receipt screenshot.
 *
 * @param {string} id
 */
export function isRedirectPaymentGateway(id) {
  return PAYMENT_GATEWAYS[id]?.mode === "redirect";
}

/**
 * @param {string} id
 * @param {"ar"|"en"} [lang]
 * @returns {string} the gateway's display name, or the raw id if unknown
 */
export function paymentGatewayName(id, lang = "ar") {
  const gateway = PAYMENT_GATEWAYS[id];
  if (!gateway) return id;
  return lang === "en" ? gateway.nameEn : gateway.nameAr;
}
