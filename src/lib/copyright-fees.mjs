// المصدر الوحيد لرسوم بوابة حماية حقوق المؤلف.
//
// كانت هذه القيم مكرّرة في ثلاثة أماكن — صفحة الخدمة، قوالب البريد، وإيصال
// الـ PDF — وكل واحد يكتبها بصيغته الخاصة ("31,300 ل.س" مقابل "31300 ل.س"
// مقابل الرقم المجرّد). أي تعديل على التسعيرة كان يستوجب تذكّر الثلاثة معاً،
// وهو ما يجعل الإيصال المطبوع يخالف ما دفعه المواطن فعلاً دون أن يفشل شيء.
//
// بيانات صِرفة بلا React ولا Prisma، فتعمل على العميل والخادم وتحت
// `node --test` على حد سواء — نفس نهج payment-gateways.mjs.

// الصفات التي تجعل الطلب طلبَ جهةٍ اعتبارية (شركة/دار نشر) لا فرداً.
const COMPANY_ROLES = ["الشريك", "المدير العام", "المستثمر", "رئيس مجلس إدارة", "صاحب الشركة"];

// الرسوم بالليرة السورية بعد حذف صفرين (إعادة تسمية العملة).
// القيم أرقام مجرّدة — التنسيق مسؤولية جهة العرض وحدها.
export const COPYRIGHT_FEES = Object.freeze({
  company: Object.freeze({
    initialBase: 510,
    initialStamps: 3,
    initialTotal: 513,
    finalBase: 470,
    finalStamps: 3,
    finalTotal: 473,
  }),
  individual: Object.freeze({
    initialBase: 310,
    initialStamps: 3,
    initialTotal: 313,
    finalBase: 470,
    finalStamps: 3,
    finalTotal: 473,
  }),
});

/**
 * هل صفة مقدّم الطلب تمثّل جهة اعتبارية؟
 * @param {string} role
 */
export function isCompanyRole(role) {
  return COMPANY_ROLES.includes(role);
}

/**
 * رسوم الطلب حسب صفة مقدّمه.
 * @param {string} role
 * @returns {typeof COPYRIGHT_FEES.individual}
 */
export function getFeesForRole(role) {
  return isCompanyRole(role) ? COPYRIGHT_FEES.company : COPYRIGHT_FEES.individual;
}

/**
 * تنسيق مبلغ للعرض مع فواصل الآلاف ووحدة العملة.
 * @param {number} amount
 * @param {{ withUnit?: boolean }} [options]
 */
export function formatFee(amount, { withUnit = true } = {}) {
  const formatted = amount.toLocaleString("en-US");
  return withUnit ? `${formatted} ل.س` : formatted;
}
