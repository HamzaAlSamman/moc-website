import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { COPYRIGHT_FEES, formatFee, getFeesForRole, isCompanyRole } from "./copyright-fees.mjs";

// الرسوم كانت مكتوبة يدوياً في ثلاثة ملفات بثلاث صيغ مختلفة. الاختبار يحرس
// أمرين: أن الحساب داخل الجدول متسق، وأن أحداً لم يُعِد كتابة مبلغ في أي من
// الملفات الثلاثة بدل قراءته من المصدر الموحّد.

test("each fee table adds up: base + stamps = total", () => {
  for (const [tier, fees] of Object.entries(COPYRIGHT_FEES)) {
    assert.equal(
      fees.initialBase + fees.initialStamps,
      fees.initialTotal,
      `${tier}: initial base + stamps must equal the initial total`,
    );
    assert.equal(
      fees.finalBase + fees.finalStamps,
      fees.finalTotal,
      `${tier}: final base + stamps must equal the final total`,
    );
  }
});

test("company applicants pay a higher initial fee, and the final fee is shared", () => {
  const company = getFeesForRole("المدير العام");
  const individual = getFeesForRole("المؤلف");

  assert.ok(isCompanyRole("المدير العام"));
  assert.ok(!isCompanyRole("المؤلف"));
  assert.ok(company.initialTotal > individual.initialTotal);
  assert.equal(company.finalTotal, individual.finalTotal, "the final fee does not depend on applicant type");
});

test("an unknown role is billed as an individual, never as a company", () => {
  // التصنيف الافتراضي يجب أن يكون الأرخص: صفة غير معروفة يجب ألا تُحمّل
  // مواطناً فرداً رسمَ جهةٍ اعتبارية.
  assert.deepEqual(getFeesForRole(""), COPYRIGHT_FEES.individual);
  assert.deepEqual(getFeesForRole("صفة غير معروفة"), COPYRIGHT_FEES.individual);
  assert.deepEqual(getFeesForRole(undefined), COPYRIGHT_FEES.individual);
});

test("fees are post-redenomination amounts, not the old three-zero values", () => {
  // بعد حذف صفرين لم يعد أي رسم يبلغ عشرات الآلاف. رقم من الحقبة القديمة
  // يعني أن أحد الملفات لم يُحدَّث.
  for (const fees of Object.values(COPYRIGHT_FEES)) {
    for (const [field, amount] of Object.entries(fees)) {
      assert.ok(amount > 0, `${field} must be positive`);
      assert.ok(amount < 10000, `${field} = ${amount} looks like a pre-redenomination amount`);
    }
  }
  assert.equal(COPYRIGHT_FEES.individual.initialTotal, 313);
  assert.equal(COPYRIGHT_FEES.company.initialTotal, 513);
  assert.equal(COPYRIGHT_FEES.individual.finalTotal, 473);
});

test("formatFee renders western digits with a currency unit", () => {
  assert.equal(formatFee(513), "513 ل.س");
  assert.equal(formatFee(1234), "1,234 ل.س");
  assert.equal(formatFee(513, { withUnit: false }), "513");
});

test("no consumer hardcodes a fee amount instead of reading the shared module", () => {
  const consumers = [
    path.join("src", "app", "[locale]", "services", "copyright", "page.js"),
    path.join("src", "lib", "copyright-mailer.js"),
    path.join("src", "lib", "receipt-pdf.js"),
  ];

  const stale = [];
  for (const relative of consumers) {
    const source = readFileSync(path.join(process.cwd(), relative), "utf8");
    // المبالغ القديمة بصيغتيها، وأي مبلغ ليرة مكتوب حرفياً في الشيفرة.
    for (const match of source.matchAll(/\b(51,?300|47,?300|31,?300|51,?000|47,?000|31,?000)\b/g)) {
      stale.push(`${relative}: ${match[1]}`);
    }
    assert.ok(
      source.includes("copyright-fees"),
      `${relative} must import the shared fee module rather than restate amounts`,
    );
  }

  assert.deepEqual(stale, [], "pre-redenomination fee amounts still hardcoded");
});
