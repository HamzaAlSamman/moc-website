# تصميم: تسليم شهادة حقوق المؤلف عبر المركز الثقافي

> **For Claude:** نفّذ هذه الخطة عبر `superpowers:writing-plans` ثم `superpowers:executing-plans` — اختبار فاشل قبل كل تغيير سلوكي (`superpowers:test-driven-development`)، ولا ادّعاء إنجاز قبل تشغيل الاختبارات والبناء (`superpowers:verification-before-completion`).

## 1. الهدف

إضافة خطوة إلزامية لكل معاملة حقوق مؤلف: بعد اعتماد الرسم النهائي، يُرسل المصنف إلى المركز الثقافي الأقرب لمحافظة المتقدم، ولا تصدر الشهادة (ورقياً أو إلكترونياً) للمواطن إلا بعد تأكيد موظف ذلك المركز استلامها.

## 2. القرارات المعتمدة (من جلسة النقاش)

| القرار | الخيار النهائي |
|---|---|
| نطاق الخطوة | إلزامية لكل معاملة، بغض النظر عن طريقة تسليم الشهادة لاحقاً |
| اختيار المواطن | لا يختار "ورقية/إلكترونية" — يختار محافظته فقط كما اليوم |
| قرار طريقة التسليم | داخلي بحت، يحدده موظف المركز لحظة التأكيد، ولا يُعلَم المواطن به مسبقاً |
| عدد الحالات الجديدة | حالة واحدة فقط: `pending_center_delivery` (لا حالتين منفصلتين لـ"أُرسلت"/"وصلت") |
| من يؤكد الاستلام | حساب مخصص لكل مركز ثقافي (دور جديد `CULTURAL_CENTER_OFFICER`، معزول بصلاحياته على مركزه فقط) |
| اختيار المركز الوجهة | قائمة منسدلة مفلترة حسب محافظة المعاملة (تحديث يدوي من الموظف، وليس تلقائياً بالكامل) |
| بيانات المراكز الناقصة | تُستكمل بإدخالات مبسّطة لكل محافظة (تفصيل بالقسم 7) — لا حل بديل تلقائي |

## 3. نموذج البيانات (Prisma)

### `CopyrightSubmission` — حقول جديدة

```prisma
assignedCenterId     String?
assignedCenter       CulturalCenter? @relation(fields: [assignedCenterId], references: [id], onDelete: SetNull)
centerDeliveryMethod String?   // "paper" | "electronic"
centerConfirmedAt    DateTime?
centerConfirmedById  String?
```

يتبع نفس نمط `reviewedById`/`reviewedAt` الموجود على `Event` — معرّف مستخدم عادي (بدون علاقة Prisma) حتى يبقى السجل ذا معنى حتى لو حُذف حساب الموظف لاحقاً.

### `User` — حقل جديد

```prisma
assignedCenterId String?
assignedCenter   CulturalCenter? @relation(fields: [assignedCenterId], references: [id], onDelete: SetNull)
```

يُملأ فقط لحسابات الدور `CULTURAL_CENTER_OFFICER`؛ يبقى `null` لبقية الأدوار.

### `Role` enum — قيمة جديدة

```prisma
CULTURAL_CENTER_OFFICER
```

## 4. سير العمل (applicationStatus)

تعديل `src/lib/business-rules.mjs`:

```
COPYRIGHT_STATUS_GRAPH.final_review: { pending_center_delivery, pending_fees, rejected }   // بدل completed
COPYRIGHT_STATUS_GRAPH.pending_center_delivery: { completed }                              // جديدة

COPYRIGHT_TRANSITIONS.FINANCE: "final_review:pending_center_delivery"   // بدل final_review:completed
COPYRIGHT_TRANSITIONS.CULTURAL_CENTER_OFFICER: "pending_center_delivery:completed"          // جديد
```

المسار الكامل يصير:

```
... → pending_fees → final_review → pending_center_delivery → completed
```

## 5. الصلاحيات والعزل

- `canTransitionCopyright` وحده لا يكفي لعزل موظف المركز — نفس نمط التحقق الموجود بالراوت لـ STUDIES_ASSESSOR/STUDIES_HEAD/LEGAL_DIRECTOR (فحص "صاحب المرحلة" داخل `PATCH /api/admin/copyright-submissions/[id]`) يُستنسخ هنا: عندما `session.role === CULTURAL_CENTER_OFFICER` والانتقال هو `pending_center_delivery → completed`، يُتحقق أن `existing.assignedCenterId === officer.assignedCenterId` (بجلب صف المستخدم من قاعدة البيانات، بلا حاجة لتعديل الجلسة/JWT).
- عند الانتقال `final_review → pending_center_delivery` يجب أن يُرفق `assignedCenterId` بالطلب (إلزامي، وإلا يُرفض بـ 400).
- عند الانتقال `pending_center_delivery → completed` يجب أن يُرفق `centerDeliveryMethod` (`paper` أو `electronic`، إلزامي).
- الأدمن/SUPER_ADMIN يتجاوزون العزل كالمعتاد.
- صفحة `/admin/copyright`: عندما يكون المستخدم `CULTURAL_CENTER_OFFICER`، تُفلتر القائمة تلقائياً لمعاملات مركزه فقط (بدل كل المعاملات).

## 6. واجهة الإدارة

- **`/admin/users`**: عند اختيار الدور `CULTURAL_CENTER_OFFICER` بنموذج إنشاء/تعديل المستخدم، تظهر قائمة منسدلة لاختيار المركز الثقافي (تُقرأ من نفس API الموجود لإدارة المراكز).
- **`CopyrightDetailView.jsx`**:
  - عند `final_review` (لدور المالية/الأدمن): بطاقة جديدة "إرسال إلى المركز الثقافي" — قائمة منسدلة تُفلتر تلقائياً حسب محافظة المعاملة (`province`)، مع رسالة واضحة إن لم توجد مراكز مسجلة لتلك المحافظة (تحدث فقط إذا لم يُشغَّل seed القسم 7).
  - عند `pending_center_delivery` (لموظف المركز المطابق أو الأدمن): بطاقة "تأكيد استلام المصنف" — زر/اختيار لطريقة التسليم (ورقياً/إلكترونياً) ثم تأكيد، ينقل الحالة لـ `completed`.
- **`CopyrightManager.jsx`**: إضافة تسمية وتصنيف الحالة الجديدة إلى `STATUS_LABELS`/`STATUS_CLASSES` (مثلاً: "بانتظار التسليم عبر المركز الثقافي").

## 7. بيانات المراكز الثقافية (استكمال `prisma/seed-centers.js`)

إضافات جديدة (upsert آمن، بدون لمس الإدخالات الحالية):

| المحافظة | الاسم |
|---|---|
| دمشق | وزارة الثقافة في دمشق |
| ريف دمشق | وزارة الثقافة في دمشق |
| حلب | المركز الثقافي في حلب |
| حمص | المركز الثقافي في حمص |
| حماة | المركز الثقافي في حماة |
| اللاذقية | المركز الثقافي في اللاذقية |
| طرطوس | المركز الثقافي في طرطوس |
| السويداء | المركز الثقافي في السويداء |
| درعا | المركز الثقافي في درعا |
| القنيطرة | المركز الثقافي في القنيطرة |
| دير الزور | المركز الثقافي في دير الزور |
| الرقة | المركز الثقافي في الرقة |
| الحسكة | المركز الثقافي في الحسكة |
| إدلب | المركز الثقافي في إدلب |

هذا يضمن أن كل محافظة تملك خياراً واحداً واضحاً على الأقل بقائمة الإرسال، بينما تبقى الإدخالات التفصيلية الحالية لدمشق/ريف دمشق (لخدمة طلب الفعاليات) متاحة أيضاً كخيارات إضافية عند الحاجة.

## 8. الإشعارات

- عند الإرسال للمركز: إشعار داخلي مُوجَّه فقط لموظفي ذلك المركز تحديداً (دالة جديدة صغيرة تُشابه `notifyByRole` لكن تُفلتر أيضاً بـ `assignedCenterId`، أو استدعاء `notify()` الفردي بحلقة على نتيجة `findMany({role: CULTURAL_CENTER_OFFICER, assignedCenterId})`).

## 9. البريد الإلكتروني للمواطن

عند الوصول لـ `completed`:

- `centerDeliveryMethod === "electronic"` → **بلا تغيير**: نفس `sendCompletedEmail` الحالي (PDF الشهادة مرفق).
- `centerDeliveryMethod === "paper"` → إيميل تأكيد أخف (بلا إرفاق الشهادة، لأنها سُلّمت شخصياً) — يوضح أن الشهادة استُلمت من المركز الثقافي.

## 10. خارج النطاق (عمداً)

- لا خيار للمواطن بين ورقي/إلكتروني (حُسم: لا يُعلَم مسبقاً).
- لا حساب "نفسه" لأكثر من مركز — علاقة واحد-لواحد بين الحساب والمركز.
- لا حل تلقائي لمحافظة بلا مركز مسجل (بعد تنفيذ القسم 7 هذا لن يحدث فعلياً ضمن الـ 14 محافظة).
- لا تعديل على شكل PDF الشهادة نفسها — نفس الملف، يتغير فقط قناة التسليم.
