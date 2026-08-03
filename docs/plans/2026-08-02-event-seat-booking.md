# الخطة النهائية المنقّحة: حسابات المواطنين، توثيق البريد والهوية، وحجز الفعاليات

> **نسخة تنفيذية نهائية** تجمع الخطة الأصلية مع جميع التصحيحات الأمنية والتقنية والتشغيلية التي ظهرت بعد مراجعة الكود الفعلي.
>
> **For Claude:** نفّذ هذه الخطة مهمةً بمهمة. استخدم `superpowers:executing-plans`، واكتب اختباراً فاشلاً قبل كل تغيير سلوكي باستخدام `superpowers:test-driven-development`، ولا تدّعِ الإنجاز قبل تشغيل اختبارات القبول والبناء باستخدام `superpowers:verification-before-completion`.

---

## 1. الهدف العام

إنشاء نظام متكامل يتيح للمواطن:

1. إنشاء حساب باسم كامل وبريد إلكتروني وكلمة مرور ورقم هاتف ورقم وطني.
2. استلام رمز تحقق من **6 أرقام** عبر حساب بريد وزارة الثقافة المعرّف في متغيرات البيئة.
3. إدخال الرمز خلال 10 دقائق لتفعيل البريد.
4. رفع صورة الوجه الأمامي والخلفي للهوية مرة واحدة.
5. تسجيل الدخول ومتابعة حالة التوثيق حتى قبل قبول الهوية.
6. حجز الفعاليات فقط بعد:
   - توثيق البريد.
   - اعتماد الهوية إدارياً.
   - وجود جلسة مواطن صالحة.
   - كون الحساب نشطاً وغير محظور.
7. منع الشخص نفسه من امتلاك أكثر من حجز نشط في الفعالية الواحدة.
8. دعم السعة، قائمة الانتظار، الترقية التلقائية، الإلغاء، والحضور.
9. الحفاظ على الفعاليات التي لا تحتاج حجزاً وعلى روابط الحجز الخارجية.
10. حماية بيانات الهوية ومنع وصول الموظفين غير المخولين إليها.

---

## 2. القرارات المعتمدة

| القرار | الخيار النهائي |
|---|---|
| حساب المواطن | جدول وجلسة منفصلان تماماً عن الموظفين |
| تسجيل الدخول | بريد إلكتروني + كلمة مرور |
| تفعيل البريد | رمز عشوائي من 6 أرقام يرسل من بريد الوزارة |
| صلاحية رمز البريد | 10 دقائق `600 ثانية` |
| إعادة إرسال الرمز | بعد 60 ثانية على الأقل |
| محاولات إدخال الرمز | 5 محاولات لكل تحدٍ، ثم يُبطل |
| تخزين الرمز | لا يخزن صريحاً؛ يخزن HMAC Hash فقط |
| مصدر إرسال البريد | إعدادات SMTP الخاصة بحساب الوزارة من `.env` |
| جلسة بعد التفعيل | يمكن إنشاء جلسة تلقائياً بعد نجاح رمز التسجيل الأول |
| توثيق الهوية | صورتان أمامية وخلفية، ثم مراجعة إدارية |
| تسجيل الدخول قبل اعتماد الهوية | مسموح |
| الحجز قبل اعتماد الهوية | ممنوع |
| التفرّد | HMAC للرقم الوطني + فهرس فريد |
| الرقم الوطني | لا يخزن صريحاً؛ الهاش وآخر 4 خانات فقط |
| صور الهوية | تخزين محلي خاص خارج `public/` عبر `PRIVATE_UPLOAD_DIR` |
| EXIF في الإصدار الأول | لا يعاد ترميز الصور؛ الإزالة مؤجلة بوضوح |
| عرض صور الهوية | تنزيل محمي فقط للمخولين، وليس رابطاً عاماً |
| نوع المقاعد | سعة عامة بلا أرقام مقاعد |
| قائمة الانتظار | متاحة حسب إعداد الفعالية |
| الحجز الخارجي | له الأولوية ولا يتداخل مع الحجز الداخلي |
| معالجة البريد المهم | Outbox + Cron محمي |
| الرقم المرجعي | إعادة استخدام المولّد الذري القائم وإضافة `BOOKING: "BKG"` |

---

## 3. توضيح مهم حول ملف `.env` ورمز التحقق

ملف `.env` **لا يحتوي رمز التحقق نفسه** ولا يولّد الرمز بمفرده.

يحتوي `.env` فقط على:

- بيانات الاتصال بحساب بريد وزارة الثقافة.
- اسم وعنوان المرسل.
- سر HMAC الخاص برموز التحقق.
- مدة صلاحية الرمز وحدود الإرسال والمحاولات.

أما التطبيق فيولّد الرمز تلقائياً في الخادم عند التسجيل أو طلب إعادة الإرسال:

```js
const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
```

يُرسل الرمز للمواطن عبر حساب الوزارة، ولا يُخزن النص الصريح في قاعدة البيانات أو السجلات.

### لماذا 10 دقائق وليست دقيقة أو دقيقتين؟

المقارنة الصحيحة ليست بين دقيقة ودقيقتين، بل بين نافذة قصيرة ونافذة تكفي للبريد فعلياً. رموز SMS قصيرة العمر لأن التسليم فوري؛ البريد ليس كذلك:

1. **Greylisting.** كثير من مزودات البريد — Gmail وOutlook خصوصاً — تؤجل أول رسالة من مُرسل جديد عمداً لمدة 5 إلى 15 دقيقة. نطاق الوزارة يراسل كل مواطن لأول مرة، فالنافذة القصيرة تعني أن الرمز يصل ميتاً لأول مستخدم من كل مزود.
2. **حلقة مغلقة.** بمدة 120 ثانية وفاصل إعادة إرسال 60 ثانية: إذا استغرق التسليم 90 ثانية، فكل رمز يُصدر ينتهي قبل وصوله، والمستخدم يدور في حلقة لا نهائية بلا رسالة خطأ مفهومة.
3. **الأمان لا يأتي من المدة.** مع 5 محاولات على رمز من 6 أرقام، احتمال التخمين هو 5 من مليون سواء كانت النافذة دقيقتين أو 10 دقائق. الحماية الفعلية هي: سقف المحاولات، وتخزين HMAC بدل النص الصريح، وإبطال الرمز القديم عند إصدار رمز جديد — وكلها مطبقة في هذه الخطة. تقصير المدة يدفع ثمناً كبيراً في سهولة الاستخدام مقابل ربح أمني قريب من الصفر.

القيم الافتراضية:

```text
مدة الرمز: 600 ثانية
إعادة الإرسال: بعد 60 ثانية
عدد المحاولات: 5
```

يمكن جعلها قابلة للتعديل من `.env` دون تغيير الكود.

> ملاحظة تقنية: `sendMail` في `src/lib/mailer.js` يُرجع نجاحاً عندما **يقبل** خادم SMTP الرسالة، لا عندما تصل إلى صندوق المستخدم. لذلك لا يوجد أي سبيل برمجي لقياس زمن التسليم الفعلي، وهو سبب إضافي لاختيار نافذة سخية.

---

## 4. معنى توثيق الهوية

رفع الرقم الوطني وصور الهوية مع مراجعة موظف مخوّل يقلل التكرار والانتحال، لكنه لا يشكل تحققاً حكومياً آلياً ما لم يوجد ربط رسمي مع سجل حكومي.

الصياغة الدقيقة:

```text
رقم وطني مُدخل واحد → حساب واحد → حجز نشط واحد في كل فعالية
```

ولا يجوز الادعاء بأن النظام يثبت الملكية المدنية للهوية آلياً.

---

## 5. البنية التقنية

- Next.js 16.2 App Router
- React 19
- Prisma 6
- PostgreSQL
- Zod 4
- jose
- bcryptjs
- nodemailer
- Node test runner (`node --test`)
- Tailwind CSS 4
- تخزين محلي خاص عبر `PRIVATE_UPLOAD_DIR`
- Cron من Plesk أو النظام لمعالجة Outbox

---

## 6. فصل جلسات المواطنين عن الموظفين

هذه المرحلة تسبق كل كود حسابات أو حجز.

### 6.1 جماهير التوكنات

```js
export const TOKEN_AUDIENCE = {
  CMS: "moc:cms",
  CITIZEN: "moc:citizen",
  GATE: "moc:gate",
};
```

الدوال:

```js
encryptFor(audience, payload, expiresIn)
decryptFor(audience, token)
```

### 6.2 قواعد إلزامية

1. جلسة المواطن في `citizen-session`.
2. جلسة الموظف في `cms-session`.
3. حمولة المواطن تستخدم `citizenId` و`sessionVersion` فقط وما يلزم تقنياً.
4. ممنوع وضع `userId` أو `role` في توكن المواطن.
5. `verifyCitizenSession()` تقرأ من `prisma.citizen` فقط.
6. `verifySession()` تقرأ من `prisma.user` فقط.
7. توكن مواطن لا يفتح `/admin` أو `/api/admin`.
8. توكن CMS لا يعمل كتوكن مواطن.
9. توكن بلا `aud` يُرفض.
10. الخوارزمية محصورة بـ `HS256` أو الخوارزمية المعتمدة في المشروع.

### 6.3 إبطال الجلسات

أضف إلى المواطن:

```prisma
sessionVersion    Int      @default(1)
passwordChangedAt DateTime @default(now())
```

تُزاد `sessionVersion` عند:

- تغيير كلمة المرور.
- الخروج من جميع الأجهزة.
- حظر الحساب.
- قرار أمني بإبطال الجلسات.

### 6.4 أثر النشر

إضافة فحص `audience` ستؤدي إلى خروج إجباري لمرة واحدة للجلسات القديمة. يجب توثيق ذلك قبل النشر.

---

## 7. مخطط قاعدة البيانات

## 7.1 حالة توثيق الهوية

لا تخلط حالة البريد مع حالة الهوية.

```prisma
enum CitizenIdentityStatus {
  NOT_SUBMITTED
  PENDING
  VERIFIED
  REJECTED
}
```

مصدر حقيقة توثيق البريد هو:

```prisma
emailVerifiedAt DateTime?
```

مصدر حقيقة توثيق الهوية هو:

```prisma
identityStatus CitizenIdentityStatus
```

الحظر والنشاط مستقلان:

```prisma
isActive  Boolean
isBlocked Boolean
```

لا تستخدم حالة موحدة مثل `EMAIL_PENDING` و`SUSPENDED` لأنها تكرر معاني الحقول السابقة وتخلق تعارضات.

## 7.2 حساب المواطن

```prisma
model Citizen {
  id        String @id @default(cuid())
  email     String @unique
  password  String
  fullName  String
  phone     String?

  // ⚠️ لا تضع @unique هنا. التفرّد مقصور على الحسابات الموثقة عبر فهرس جزئي
  // في migration (راجع 13.3 و15.1): حساب لم يُفعَّل بريده يجب ألا يحجز الرقم
  // الوطني إلى الأبد بسبب خطأ إملائي في البريد أو فشل SMTP.
  nationalIdHash  String
  nationalIdLast4 String

  emailVerifiedAt DateTime?

  identityStatus         CitizenIdentityStatus @default(NOT_SUBMITTED)
  identitySubmittedAt    DateTime?
  identityVerifiedAt     DateTime?
  identityVerifiedById   String?
  identityRejectedAt     DateTime?
  identityRejectedReason String?

  identityFrontFileKey String?
  identityBackFileKey  String?

  isActive      Boolean @default(true)
  isBlocked     Boolean @default(false)
  blockedReason String?

  failedLogins Int       @default(0)
  lockedUntil  DateTime?
  lastLoginAt  DateTime?

  sessionVersion    Int      @default(1)
  passwordChangedAt DateTime @default(now())

  bookings    EventBooking[]
  emailOtps   CitizenEmailOtp[]
  tokens      CitizenToken[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([emailVerifiedAt])
  @@index([identityStatus])
  @@index([isBlocked, isActive])
  @@index([nationalIdHash])
}
```

### 7.2.1 لماذا التفرّد جزئي وليس مطلقاً

`@unique` مطلق على `nationalIdHash` يخلق مصيدة لا مخرج منها:

```text
المواطن يسجل ويكتب بريده خطأً (أو يفشل SMTP)
→ صفّ Citizen أُنشئ فعلاً وحجز الرقم الوطني
→ الحساب غير قابل للوصول لأن البريد ليس بريده
→ يعيد التسجيل بالبريد الصحيح
→ "يوجد حساب مسجل بهذا الرقم الوطني"
→ عالق نهائياً، ولا مسار استرداد لأنه لا يستطيع تفعيل بريد ليس له
```

أخطاء كتابة البريد عند التسجيل شائعة، فهذه ليست حالة نادرة. الحل ثلاثي:

1. فهرس فريد جزئي على الحسابات الموثقة فقط (القسم 13.3).
2. إعادة فحص التفرّد **داخل** معاملة التحقق من الرمز (القسم 15.3)، لأن الفهرس الجزئي لا يمنع وجود عدة حسابات غير موثقة بالرقم نفسه.
3. حذف دوري للحسابات غير الموثقة الأقدم من 24 ساعة (القسم 28.1).

القيد نفسه ينطبق بدرجة أخف على `email`؛ يبقى `@unique` مطلقاً عليه لأن البريد هو معرّف الدخول، لكن الحساب غير الموثق الذي يحجزه يُحذف بالمهمة الدورية نفسها.

## 7.3 رمز البريد من 6 أرقام

```prisma
enum CitizenEmailOtpPurpose {
  EMAIL_VERIFICATION
  EMAIL_CHANGE
}

model CitizenEmailOtp {
  id        String @id @default(cuid())
  citizenId String
  citizen   Citizen @relation(fields: [citizenId], references: [id], onDelete: Cascade)

  purpose  CitizenEmailOtpPurpose
  codeHash String

  expiresAt DateTime
  consumedAt DateTime?
  revokedAt  DateTime?

  attempts    Int @default(0)
  maxAttempts Int @default(5)

  sentAt     DateTime @default(now())
  ipHash     String?
  userAgentHash String?

  createdAt DateTime @default(now())

  @@index([citizenId, purpose, createdAt, id])
  @@index([expiresAt, consumedAt, revokedAt])
}
```

### 7.3.1 تخزين الرمز

بسبب أن الرمز 6 أرقام فقط، لا يكفي SHA-256 بلا سر؛ يمكن تجربة مليون احتمال عند تسرب قاعدة البيانات.

استخدم HMAC:

```text
HMAC_SHA256(
  CITIZEN_OTP_SECRET,
  otpId + citizenId + purpose + code
)
```

ويجب استخدام مقارنة بزمن ثابت.

## 7.4 توكنات طويلة العمر

رمز البريد لا يستخدم جدول التوكنات الطويلة.

```prisma
enum CitizenTokenPurpose {
  PASSWORD_RESET
  EMAIL_CHANGE_CONFIRMATION
}

model CitizenToken {
  id        String @id @default(cuid())
  citizenId String
  citizen   Citizen @relation(fields: [citizenId], references: [id], onDelete: Cascade)

  purpose   CitizenTokenPurpose
  tokenHash String @unique
  newEmail  String?

  expiresAt DateTime
  consumedAt DateTime?
  createdAt DateTime @default(now())

  @@index([citizenId, purpose, createdAt])
  @@index([expiresAt])
}
```

إن لم يُنفذ تغيير البريد في الإصدار الأول، احذف الحقول والغرض الخاصين به مؤقتاً.

---

## 8. إعداد الحجز على الفعالية

بدلاً من Boolean لا يوضح الفرق بين عدم وجود حجز وبين إغلاق حجوزات جديدة، استخدم حالة صريحة.

```prisma
enum EventBookingAvailability {
  DISABLED
  OPEN
  CLOSED
}
```

- `DISABLED`: الفعالية لا تستخدم نظام الحجز الداخلي.
- `OPEN`: يمكن إنشاء حجوزات جديدة ضمن النافذة الزمنية.
- `CLOSED`: لا حجوزات جديدة، لكن الحجوزات الحالية محفوظة.

إضافات `Event`:

```prisma
bookingAvailability EventBookingAvailability @default(DISABLED)
capacity            Int?
bookedCount         Int @default(0)
waitlistEnabled     Boolean @default(true)
bookingOpensAt      DateTime?
bookingClosesAt     DateTime?
bookingNoteAr       String? @db.Text
bookingNoteEn       String? @db.Text
bookings            EventBooking[]
```

### 8.1 قواعد الحقول

- إذا كانت الحالة `OPEN` يجب أن توجد `capacity > 0`.
- لا يمكن خفض السعة تحت `bookedCount`.
- نافذة الحجز:

```text
bookingOpensAt < bookingClosesAt <= startDate
```

- التواريخ تخزن UTC.
- عند وجود `bookingUrl` خارجي أو `source !== MOC` يمنع الحجز الداخلي من API.

---

## 9. فصل حالة الحجز عن الحضور

```prisma
enum EventBookingStatus {
  CONFIRMED
  WAITLISTED
  CANCELLED
}

enum EventAttendanceStatus {
  NOT_CHECKED_IN
  ATTENDED
  NO_SHOW
}

enum EventBookingSource {
  CITIZEN
  ADMIN
}
```

لا تنقل الحجز إلى `ATTENDED`. يبقى `status = CONFIRMED` ويُعدّل `attendanceStatus` فقط.

---

## 10. نموذج الحجز

```prisma
model EventBooking {
  id          String @id @default(cuid())
  referenceNo String @unique

  eventId String
  event   Event @relation(fields: [eventId], references: [id], onDelete: Restrict)

  citizenId String?
  citizen   Citizen? @relation(fields: [citizenId], references: [id], onDelete: SetNull)

  fullName        String
  nationalIdHash  String
  nationalIdLast4 String
  email           String?
  phone           String?

  status           EventBookingStatus    @default(CONFIRMED)
  attendanceStatus EventAttendanceStatus @default(NOT_CHECKED_IN)
  source           EventBookingSource    @default(CITIZEN)

  ticketSig String

  cancelledAt     DateTime?
  cancelledBy     String?
  cancellationReason String?
  promotedAt      DateTime?
  checkedInAt     DateTime?
  checkedInById   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([eventId, status, createdAt, id])
  @@index([eventId, attendanceStatus])
  @@index([citizenId, createdAt])
  @@index([nationalIdHash])
}
```

### 10.1 منع الحذف الخاطئ

العلاقة تستخدم:

```prisma
onDelete: Restrict
```

لذلك يجب تعديل المسار القائم:

```text
src/app/api/admin/events/[id]/route.js
```

السلوك:

- إن لم توجد حجوزات: يسمح بالحذف وفق الصلاحيات القائمة.
- إن وجدت أي حجوزات: يرجع `409 Conflict` برسالة:

```text
لا يمكن حذف الفعالية لوجود حجوزات مرتبطة بها. ألغِ الفعالية أو أغلق الحجز بدلاً من حذفها.
```

لا تترك خطأ Prisma `P2003` يصل خاماً إلى الموظف.

---

## 11. صندوق الإشعارات Outbox

```prisma
enum NotificationOutboxStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
}

model NotificationOutbox {
  id        String @id @default(cuid())
  type      String
  recipient String
  payloadJson Json

  status      NotificationOutboxStatus @default(PENDING)
  attempts    Int @default(0)
  maxAttempts Int @default(8)
  lastError   String?
  availableAt DateTime @default(now())
  lockedAt    DateTime?
  lockedBy    String?
  sentAt      DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status, availableAt, createdAt])
}
```

### 11.1 الاستثناء: رمز البريد

رمز تفعيل البريد قصير العمر نسبياً ومرتبط بمستخدم ينتظر أمام الشاشة، لذلك يرسل **مباشرة وبشكل متزامن** بعد إنشاء التحدي، ولا ينتظر Cron.

إذا فشل SMTP:

1. يُبطل سجل OTP الذي لم يُرسل.
2. ترجع رسالة مناسبة دون كشف بيانات حساسة.
3. يستطيع المستخدم طلب رمز جديد بعد معالجة المشكلة.
4. **لا يُترك صفّ `Citizen` حاجزاً للرقم الوطني.** راجع القسم 15.1: تفرّد الرقم الوطني مقصور على الحسابات الموثقة، فالحساب غير الموثق لا يمنع المواطن من إعادة التسجيل.

أما رسائل الحجز والترقية والإلغاء فتستخدم Outbox.

---

## 12. إعادة استخدام الكود الموجود

## 12.1 تخزين الملفات

لا تنشئ نظام تخزين S3 جديداً.

الكود الحالي في:

```text
src/lib/legal-license-storage.mjs
```

يحتوي بالفعل على:

- التحقق من نوع الملف عبر البايتات الأولى.
- الأنواع JPEG وPNG وWebP.
- حد 5 MB.
- تخزين خاص خارج `public/`.
- توكنات وصول ومقارنة بزمن ثابت.

المطلوب:

1. استخراج المنطق العام إلى وحدة مشتركة، مثلاً:

```text
src/lib/private-file-storage.mjs
```

2. إبقاء غلاف التراخيص الحالي.
3. إنشاء غلاف خاص بالهوية:

```text
src/lib/citizen-identity-storage.mjs
```

4. استخدام `PRIVATE_UPLOAD_DIR` الحالي.

## 12.2 عدم استخدام `sharp` في الإصدار الأول

لا تضف `sharp` الآن بسبب مخاطر البناء على خادم محدود الذاكرة.

في الإصدار الأول:

- تحقق من Magic Bytes.
- حد 5 MB.
- تخزين خارج `public/`.
- أسماء عشوائية.
- تنزيل محمي عبر `Content-Disposition: attachment`.
- `Cache-Control: no-store`.
- `X-Content-Type-Options: nosniff`.
- تسجيل التنزيل في `AuditLog`.

إزالة EXIF وإعادة الترميز مؤجلتان، ويجب ألا توصف `Content-Disposition` على أنه يزيل EXIF.

## 12.3 الرقم المرجعي

مولّد الأرقام المرجعية القائم يستخدم عداداً ذرياً ويعيد المحاولة عند `P2002`.

لا تعِد بناءه.

أضف فقط:

```js
BOOKING: "BKG"
```

إلى `REFERENCE_SCOPES` في:

```text
src/lib/reference-number.js
```

---

## 13. تسوية تاريخ Prisma Migrations

المشروع يحتوي تاريخ migrations غير كامل لأن بعض النماذج أُنشئت عبر `db push` وملفات SQL يدوية.

لا تستخدم `migrate dev` مباشرة على قاعدة البيانات الحالية.

### 13.1 الخطوات الإلزامية

1. أخذ نسخة احتياطية كاملة من قاعدة الإنتاج.
2. أخذ نسخة من قاعدة الإنتاج إلى قاعدة تجريبية منفصلة.
3. فحص جدول `_prisma_migrations` والمجلدات الموجودة.
4. توليد **Bridge/Baseline migration** يمثل الفرق بين تاريخ migrations الحالي و`schema.prisma` الحالي.
5. اختبار bridge على قاعدة فارغة تبدأ بالمجلدين التاريخيين الحاليين.
6. مقارنة المخطط الناتج مع `schema.prisma`.
7. إذا كانت قاعدة الإنتاج تحتوي هذه الجداول فعلياً بسبب `db push`، يُعلَّم bridge كمطبق باستخدام `migrate resolve --applied` بدلاً من تنفيذه عليها.
8. بعد تسوية التاريخ، أنشئ migration جديدة خاصة بهذه الميزة.
9. اختبر `migrate deploy` على:
   - قاعدة فارغة.
   - نسخة من قاعدة الإنتاج.
10. لا تنشر قبل أن ينجح المساران.

### 13.2 أوامر إرشادية

تحقق من صيغة Prisma المثبتة في المشروع قبل التنفيذ:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

> ⚠️ `--from-migrations` ينشئ **قاعدة ظل (shadow database)** مؤقتة ليعيد تشغيل تاريخ الهجرات عليها. شغّل هذا الأمر على جهاز التطوير المحلي، لا على خادم Plesk — فالخادم محدود الذاكرة (AGENTS.md يحدد البناء بـ 1024MB) ويحتاج صلاحية إنشاء قواعد بيانات. المخرجات ملف SQL نصي يُنقل إلى المستودع، فلا حاجة لتشغيل الأمر على الإنتاج إطلاقاً.

ثم ضع الناتج في migration bridge مناسبة.

على القاعدة القائمة، بعد التأكد أن المخطط موجود فعلياً:

```bash
npx prisma migrate resolve --applied <bridge_migration_name>
```

بعدها فقط:

```bash
npx prisma migrate deploy
```

### 13.3 الفهارس الجزئية

حجز نشط واحد للشخص في الفعالية الواحدة:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "EventBooking_active_person_unique"
  ON "EventBooking" ("eventId", "nationalIdHash")
  WHERE "status" IN ('CONFIRMED', 'WAITLISTED');
```

حساب موثق واحد لكل رقم وطني — الحسابات غير الموثقة مستثناة عمداً (راجع 7.2.1):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "Citizen_verified_national_id_unique"
  ON "Citizen" ("nationalIdHash")
  WHERE "emailVerifiedAt" IS NOT NULL;
```

### 13.4 القيود

```sql
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_bookedCount_nonnegative"
    CHECK ("bookedCount" >= 0),
  ADD CONSTRAINT "Event_capacity_positive"
    CHECK ("capacity" IS NULL OR "capacity" > 0),
  ADD CONSTRAINT "Event_open_requires_capacity"
    CHECK ("bookingAvailability" <> 'OPEN' OR "capacity" IS NOT NULL),
  ADD CONSTRAINT "Event_bookedCount_within_capacity"
    CHECK ("capacity" IS NULL OR "bookedCount" <= "capacity"),
  ADD CONSTRAINT "Event_booking_window_valid"
    CHECK (
      "bookingOpensAt" IS NULL
      OR "bookingClosesAt" IS NULL
      OR "bookingOpensAt" < "bookingClosesAt"
    );
```

### 13.5 البريد بحروف صغيرة

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "Citizen_email_lower_unique"
  ON "Citizen" (LOWER("email"));
```

---

## 14. وحدة الرقم الوطني

إنشاء أو تحديث:

```text
src/lib/citizen-identity.mjs
src/lib/citizen-identity.test.mjs
```

الدوال:

```js
normalizeNationalId()
hashNationalId()
lastFour()
assertIdentityPepper()
normalizeEmail()
```

القواعد:

- تحويل الأرقام العربية والهندية إلى لاتينية.
- إزالة الفراغات والشرطات.
- التحقق من الطول والصيغة.
- استخدام HMAC بـ `CITIZEN_ID_PEPPER`.
- عدم تسجيل الرقم الوطني أو الهاش في logs غير الضرورية.
- توثيق أن تغيير Pepper لاحقاً يكسر التفرّد.

---

## 15. تدفق التسجيل وتفعيل البريد برمز 6 أرقام

## 15.1 التسجيل

```text
POST /api/citizen/auth/register
```

المدخلات:

```json
{
  "fullName": "...",
  "email": "...",
  "password": "...",
  "nationalId": "...",
  "phone": "..."
}
```

الخطوات داخل الخادم:

1. تطبيع البريد والرقم الوطني.
2. التحقق من كلمة المرور والهاتف.
3. فحص وجود حساب **موثق** بالرقم الوطني نفسه (راجع 15.1.1).
4. إنشاء المواطن مع `emailVerifiedAt = null` و`identityStatus = NOT_SUBMITTED`.
5. إنشاء تحدي OTP جديد.
6. إبطال أي OTP نشط أقدم للغرض نفسه.
7. توليد رمز 6 أرقام باستخدام `crypto.randomInt`.
8. تخزين HMAC للرمز فقط.
9. ضبط `expiresAt = now + CITIZEN_EMAIL_OTP_TTL_SECONDS` (الافتراضي 600 ثانية).
10. إرسال الرمز مباشرة من حساب بريد الوزارة.
11. إعادة `challengeId` مع استجابة عامة.

الاستجابة لا تعيد الرمز أبداً، حتى في بيئة الإنتاج أو logs.

### 15.1.1 مسار الاسترداد عند تكرار الرقم الوطني

لأن التفرّد مقصور على الحسابات الموثقة (راجع 7.2.1)، يتفرع السلوك:

| الحالة | السلوك |
|---|---|
| لا يوجد حساب بالرقم الوطني | تسجيل عادي |
| يوجد حساب **موثق** بالرقم الوطني | رفض برسالة واضحة محدودة السرعة، وتوجيه إلى «نسيت كلمة المرور» أو تدفق الدعم |
| يوجد حساب **غير موثق** بالرقم الوطني | يُسمح بتسجيل جديد؛ الحساب غير الموثق لا يمنع شيئاً ويُحذف لاحقاً بالمهمة الدورية |
| يوجد حساب غير موثق بالرقم الوطني **وبالبريد نفسه** | لا تنشئ صفاً جديداً: حدّث الصف القائم (الاسم وكلمة المرور والهاتف) وأصدر رمزاً جديداً — هذا هو مسار «أعد المحاولة» الطبيعي |

هذا يغطي الحالتين الشائعتين: خطأ إملائي في البريد (يسجل من جديد ببريد صحيح)، وفشل SMTP (يعيد المحاولة بالبريد نفسه).

## 15.2 شاشة التحقق

```text
/[locale]/account/verify-email?challenge=<id>
```

تحتوي:

- ست خانات أو حقل واحد يقبل 6 أرقام.
- عداد تنازلي 10 دقائق.
- زر إعادة إرسال معطل أول 60 ثانية.
- رسالة عامة عند الخطأ.
- إمكانية تغيير البريد عبر تدفق مستقل إن تقرر دعمه.

## 15.3 التحقق من الرمز

```text
POST /api/citizen/auth/verify-email
```

المدخلات:

```json
{
  "challengeId": "...",
  "code": "123456"
}
```

التحقق:

1. التحدي موجود وغير مستهلك وغير مبطل.
2. لم تنتهِ صلاحية الرمز.
3. `attempts < maxAttempts`.
4. حساب HMAC للرمز المدخل.
5. مقارنة بزمن ثابت.
6. عند الخطأ: زيادة المحاولات.
7. عند المحاولة الخامسة الخاطئة: إبطال التحدي.
8. عند النجاح داخل معاملة واحدة:
   - **إعادة فحص التفرّد**: إن ظهر حساب موثق آخر بالرقم الوطني نفسه بين لحظة التسجيل ولحظة التحقق، ارفض التفعيل برسالة واضحة ولا تضبط `emailVerifiedAt`.
   - `consumedAt = now`.
   - `Citizen.emailVerifiedAt = now`.
   - إبطال OTPs الأخرى للغرض نفسه.
   - إنشاء جلسة مواطن اختيارياً للتسجيل الأول.

الخطوة الأولى إلزامية: الفهرس الجزئي يمنع وجود حسابين **موثقين** بالرقم نفسه، لكنه لا يمنع وجود عدة حسابات غير موثقة تتسابق على التفعيل. الفهرس سيرمي `P2002` عند الثاني — التقطه وحوّله إلى رسالة مفهومة بدل خطأ خام.

بعد النجاح ينتقل المستخدم إلى صفحة رفع الهوية.

## 15.4 إعادة إرسال الرمز

```text
POST /api/citizen/auth/resend-email-code
```

القواعد:

- رد عام لا يكشف وجود الحساب.
- لا إرسال قبل مرور 60 ثانية من آخر إرسال.
- إبطال الرمز القديم عند إصدار الجديد.
- الرمز الجديد يملك مدة صلاحية كاملة جديدة.
- حد لكل بريد، IP، وحساب.
- لا ترسل أكثر من رمز صالح في الوقت نفسه.

## 15.5 منع تعداد الحسابات والإغراق

- البريد المكرر يحصل على استجابة عامة.
- لا ترسل رسائل تنبيه في كل محاولة تسجيل ببريد موجود.
- رقم وطني مكرر يعالج برسالة محدودة أو تدفق دعم رسمي.
- لا تسجل الرمز أو كلمة المرور أو الرقم الوطني.

---

## 16. إعداد بريد وزارة الثقافة من `.env`

**لا تخترع متغيرات بريد جديدة.** `src/lib/mailer.js` يعمل في الإنتاج منذ خدمات سابقة، وله عقده الخاص بالبيئة. استخدمه كما هو:

```env
# قائمة فعلاً — لا تغيّرها ولا تكررها
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@moc.gov.sy
SMTP_TLS_INSECURE=false

# جديدة لهذه الميزة
CITIZEN_OTP_SECRET=
CITIZEN_EMAIL_OTP_TTL_SECONDS=600
CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS=60
CITIZEN_EMAIL_OTP_MAX_ATTEMPTS=5
```

ثلاث ملاحظات إلزامية على العقد القائم:

1. **لا تضف `SMTP_SECURE`.** `mailer.js:22` يشتق `secure` من `port === 465`. متغير جديد سيُكتب في `.env` ولن يفعل شيئاً، فيصبح مصدر حقيقة ثانياً صامتاً يضلل من يصحح خطأً لاحقاً.
2. **لا تضف `MINISTRY_MAIL_FROM_NAME` و`MINISTRY_MAIL_FROM_ADDRESS`.** `mailer.js:63` يستخدم `SMTP_FROM` للعنوان، والاسم المعروض «وزارة الثقافة السورية» مكتوب في الكود. إن أُريد جعل الاسم قابلاً للضبط، فذلك تعديل على `mailer.js` وليس متغيراً موازياً.
3. **`SMTP_TLS_INSECURE` مطلوب في التوثيق.** `mailer.js:27` يعتمده، والتعليق في الكود ينص على أن مُرحّل بريد الوزارة قد يحمل شهادة منتهية، وبدون ضبطه على `"true"` في تلك الحالة **لا يُرسل أي بريد إطلاقاً**. إغفاله من قائمة متغيرات البيئة يعني توقف نظام الرموز بالكامل قبل أن يبدأ.

استخدم `sendMail` و`wrapMinistryEmail` الموجودتين بدل بناء transport جديد.

قواعد:

1. لا تستخدم كلمة مرور الحساب الرئيسية إن كان مزود البريد يدعم App Password.
2. لا تضع بيانات SMTP في `NEXT_PUBLIC_*`.
3. لا ترسل الأسرار للمتصفح.
4. افشل مبكراً في الإنتاج إذا غابت القيم المطلوبة.
5. استخدم TLS وفق مزود البريد.
6. اختبر SPF وDKIM وDMARC لحساب الوزارة قدر الإمكان لتحسين وصول الرسائل.
7. الرسالة تعرض الرمز بوضوح وتذكر مدة صلاحيته.
8. لا تتضمن الرسالة صور الهوية أو الرقم الوطني.

مثال نص البريد:

```text
رمز تفعيل حسابك في منصة وزارة الثقافة هو: 123456

الرمز صالح لمدة 10 دقائق ولا تشاركه مع أي شخص.
إذا لم تطلب إنشاء الحساب، تجاهل الرسالة.
```

---

## 17. تسجيل الدخول

```text
POST /api/citizen/auth/login
```

القواعد:

- تنفيذ `bcrypt.compare` دائماً حتى لو لم يوجد الحساب.
- الحساب غير الموثق بالبريد لا يحصل على جلسة دخول كاملة؛ يعاد إلى شاشة إدخال الرمز أو طلب رمز جديد.
- بعد النجاح:
  - تصفير `failedLogins`.
  - تحديث `lastLoginAt`.
  - إصدار توكن جمهور `moc:citizen`.
  - تضمين `sessionVersion`.

### 17.1 قفل الدخول

بعد عدد الإخفاقات المعتمد:

```text
lockedUntil = now + 15 minutes
```

`lockedUntil` يمنع **تسجيل دخول جديد فقط**.

لا يدخل في أهلية الحجز لمستخدم لديه جلسة صالحة، لأن ذلك يسمح لمهاجم يعرف البريد بتنفيذ منع خدمة عبر كلمات مرور خاطئة.

---

## 18. نسيان كلمة المرور

- رد موحد دائماً.
- توكن عشوائي طويل وليس رمز 6 أرقام، إلا إذا قرر الفريق توحيد التجربة لاحقاً.
- صلاحية مقترحة 30 إلى 60 دقيقة.
- استخدام مرة واحدة.
- بعد النجاح:
  - تحديث `passwordChangedAt`.
  - زيادة `sessionVersion`.
  - إبطال توكنات الاستعادة الأخرى.
  - إرسال إشعار تغيير كلمة المرور.

روابط إعادة التعيين تُبنى حصراً من:

```env
APP_BASE_URL=
```

ممنوع اشتقاق الرابط من `Host` أو `X-Forwarded-Host` لمنع تسميم الروابط.

---

## 19. رفع صور الهوية

## 19.1 التوقيت

```text
إنشاء حساب
→ رمز البريد
→ نجاح التفعيل
→ جلسة مواطن
→ رفع الأمام والخلف
→ مراجعة إدارية
```

لا تطلب الصور عند كل تسجيل دخول.

## 19.2 Endpoint

```text
POST /api/citizen/identity/submit
```

الشروط:

- جلسة مواطن صالحة.
- البريد موثق.
- الحساب نشط وغير محظور.
- صورتان صالحتان.

بعد النجاح:

```text
identityStatus = PENDING
identitySubmittedAt = now
```

## 19.3 قواعد الملفات

- JPEG وPNG وWebP فقط.
- Magic Bytes وليس الامتداد.
- حد 5 MB لكل صورة.
- التخزين تحت `PRIVATE_UPLOAD_DIR`.
- مسار عشوائي غير قابل للتخمين.
- لا روابط عامة.
- استبدال الملفات القديمة عند إعادة الرفع بعد الرفض.
- تسجيل كل تنزيل إداري.

---

## 20. مراجعة الهوية إدارياً

الحالات:

```text
NOT_SUBMITTED
PENDING
VERIFIED
REJECTED
```

تعرض شاشة المراجعة للمخولين فقط:

- الاسم.
- البريد.
- الهاتف.
- آخر 4 خانات.
- رابطا تنزيل محميان للأمام والخلف.
- تاريخ الإرسال.
- سجل القرارات السابقة.
- قبول.
- رفض مع سبب إلزامي.

عند القبول:

```text
identityStatus = VERIFIED
identityVerifiedAt = now
identityVerifiedById = admin.id
identityRejectedAt = null
identityRejectedReason = null
```

عند الرفض:

```text
identityStatus = REJECTED
identityRejectedAt = now
identityRejectedReason = required
```

يرسل إشعار القبول أو الرفض عبر Outbox.

---

## 21. شرط الحجز النهائي

```js
function citizenMayBook(citizen) {
  return Boolean(
    citizen.emailVerifiedAt &&
    citizen.identityStatus === "VERIFIED" &&
    citizen.isActive &&
    !citizen.isBlocked
  );
}
```

لا تستخدم `lockedUntil` هنا.

الشرط يفرض في الخادم وفي طبقة الخدمة، وليس في الواجهة فقط.

الاستجابات:

```text
401: لا توجد جلسة مواطن صالحة
403: البريد غير موثق
403: الهوية غير موثقة أو مرفوضة أو قيد المراجعة
403: الحساب غير نشط أو محظور
409: الفعالية أو الحجز غير متاح
429: تجاوز حدود الطلبات
```

---

## 22. منطق الحجز وترتيب الأقفال

## 22.1 قاعدة ترتيب الأقفال

كل معاملات الحجز تستخدم الترتيب نفسه لمنع Deadlock:

```text
1. قفل صف Event أولاً
2. قفل صف EventBooking عند الحاجة
3. قفل أقدم صف انتظار عند الحاجة
4. تنفيذ التعديلات
```

ممنوع أن يبدأ مسار الإلغاء بقفل Booking ثم يقفل Event.

## 22.2 إنشاء الحجز

داخل معاملة، بهذا الترتيب حصراً:

1. **اقفل صفّ `Event` صراحةً**:

```sql
SELECT * FROM "Event" WHERE id = $1 FOR UPDATE;
```

2. تحقق من الحالة والنافذة والمصدر والسعة على الصف المقفول.
3. حاول زيادة `bookedCount` شرطياً:

```sql
UPDATE "Event"
SET "bookedCount" = "bookedCount" + 1
WHERE id = $1
  AND "bookingAvailability" = 'OPEN'
  AND "capacity" IS NOT NULL
  AND "bookedCount" < "capacity";
```

4. إن تأثر صف: أنشئ `CONFIRMED`.
5. إن لم يتأثر:
   - أنشئ `WAITLISTED` إذا كانت القائمة مفعلة.
   - وإلا أعد `FULL`.

> **ممنوع** صياغة الخطوة 1 بصيغة «اقفل الصف **أو** نفّذ التحديث الذري أولاً». الخيار الثاني يجعل الزيادة تحدث **قبل** فحوص الخطوة 2، ويترك النافذة الزمنية و`reviewStatus` بلا حماية من تعديل متزامن. القفل الصريح أولاً هو المسار الوحيد المعتمد.
>
> السبب في عدم دمج كل الشروط داخل `WHERE` جملة `UPDATE` واحدة: عندها يصبح «صفر صفوف متأثرة» غامضاً — لا يميز «اكتملت الأماكن» عن «التسجيل مغلق» عن «الفعالية غير معتمدة» — ويتطلب استعلاماً إضافياً لتحديد السبب المعروض للمواطن. القفل ثم الفحص يعطي رسالة دقيقة بخطوة واحدة.

## 22.3 منع التكرار

الفهرس الجزئي يمنع حجزين نشطين للشخص نفسه.

عند `P2002`:

- ابحث عن الحجز النشط الموجود.
- أعده أو أعد رسالة مفهومة.
- لا تعرض خطأ تقنياً.

## 22.4 اختبارات Deadlock

اختبر بالتوازي:

- إنشاء حجز مع إلغاء حجز.
- إلغاء مع رفع السعة.
- إلغاء مع ترقية قائمة الانتظار.
- عدة حجوزات وإلغاءات مختلطة.
- إعادة المحاولة عند خطأ PostgreSQL الخاص بالـ serialization/deadlock وفق سياسة محدودة.

---

## 23. قائمة الانتظار

الترتيب:

```sql
ORDER BY "createdAt" ASC, "id" ASC
```

عند إلغاء حجز مؤكد:

1. اقفل `Event` أولاً.
2. اقفل الحجز المراد إلغاؤه.
3. ابحث عن أقدم منتظر باستخدام:

```sql
FOR UPDATE SKIP LOCKED
LIMIT 1
```

4. إن وُجد:
   - حوّله إلى `CONFIRMED`.
   - اترك `bookedCount` ثابتاً.
   - أنشئ Outbox للترقية.
5. إن لم يوجد:
   - أنقص `bookedCount` دون النزول تحت الصفر.

---

## 24. إغلاق الحجز وإلغاء الفعالية

## 24.1 إغلاق حجوزات جديدة

لتوقيف الحجوزات الجديدة مع الحفاظ على الحجوزات القائمة:

```text
bookingAvailability = CLOSED
```

لا تُحوّل الحجوزات إلى `CANCELLED`.

## 24.2 تعطيل نظام الحجز

الانتقال إلى `DISABLED` مسموح فقط إذا لم توجد حجوزات نشطة، وإلا يرجع `409` ويطلب:

- إغلاق الحجوزات الجديدة، أو
- إلغاء الفعالية والحجوزات.

## 24.3 إلغاء الفعالية

أنشئ خدمة مركزية:

```js
cancelEventAndBookings()
```

داخل معاملة واحدة:

1. اقفل `Event` أولاً.
2. غيّر حالة الفعالية إلى `CANCELLED`.
3. حوّل كل `CONFIRMED` و`WAITLISTED` إلى `CANCELLED`.
4. سجّل وقت وسبب الإلغاء والموظف.
5. اجعل `bookedCount = 0`.
6. أنشئ رسائل Outbox لكل المتأثرين.
7. لا تحذف سجلات الحجز أو الحضور.

يجب أن تكون العملية Idempotent؛ تشغيلها مرتين لا يرسل إشعارات مكررة ولا يعيد الإلغاء.

---

## 25. الحضور

عند الدخول:

```text
status = CONFIRMED
attendanceStatus = ATTENDED
checkedInAt = now
checkedInById = employee.id
```

بعد انتهاء الفعالية يمكن تحويل غير الحاضرين إلى `NO_SHOW` مع إبقاء `status = CONFIRMED`.

الحضور لا يحرر مكاناً ولا يغير عداد السعة.

---

## 26. الحجز الإداري اليدوي

عند إضافة حجز من لوحة الإدارة يجب إدخال:

- الاسم الكامل.
- الرقم الوطني.
- الهاتف أو البريد إن وجد.
- سبب الحجز اليدوي، إلزامي.

الخادم:

1. يطبع الرقم الوطني.
2. يولد `nationalIdHash` و`nationalIdLast4`.
3. يبحث عن Citizen موجود بالهاش ويربطه إن وجد.
4. يفحص الفهرس ومنع التكرار.
5. لا يخزن الرقم الوطني الصريح.
6. يسجل الموظف والسبب في `AuditLog`.
7. لا يسمح بتجاوز السعة في الإصدار الأول.
8. يستخدم `source = ADMIN`.

---

## 27. الصلاحيات

```js
VIEW_EVENT_BOOKINGS: [SUPER_ADMIN, ADMIN, EVENT_MANAGER, DIRECTORATE],
MANAGE_EVENT_BOOKINGS: [SUPER_ADMIN, ADMIN, EVENT_MANAGER, DIRECTORATE],
EXPORT_EVENT_BOOKINGS: [SUPER_ADMIN, ADMIN, EVENT_MANAGER],
MANAGE_CITIZEN_ACCOUNTS: [SUPER_ADMIN, ADMIN],
REVIEW_CITIZEN_IDENTITY: [SUPER_ADMIN, ADMIN],
VIEW_CITIZEN_IDENTITY_FILES: [SUPER_ADMIN, ADMIN],
```

لا تمنح `EDITOR` صلاحية مشاهدة أسماء وبريد الحاضرين افتراضياً.

قواعد:

- `DIRECTORATE` يرى ويدير فعالياته فقط.
- فحص الملكية في API والخادم.
- موظف البوابة يرى الحد الأدنى: الاسم، المرجع، آخر 4 خانات، وحالة التوثيق.
- لا صور هوية في CSV.
- كل تصدير وتنزيل هوية يسجل في `AuditLog`.

---

## 28. البريد والإشعارات

الرسائل:

1. رمز تفعيل البريد.
2. ترحيب بعد التفعيل.
3. استلام صور الهوية.
4. قبول الهوية.
5. رفض الهوية مع السبب.
6. إعادة تعيين كلمة المرور.
7. تغيير كلمة المرور.
8. تأكيد الحجز.
9. دخول قائمة الانتظار.
10. الترقية.
11. إلغاء الحجز.
12. إلغاء الفعالية.
13. تذكير اختياري.

### 28.1 Cron لمعالجة Outbox

لا تستخدم `setInterval` داخل التطبيق كخيار أساسي.

أنشئ Endpoint داخلياً:

```text
POST /api/internal/process-notification-outbox
```

محمي بـ:

```http
Authorization: Bearer <OUTBOX_CRON_SECRET>
```

يشغله Plesk Scheduled Task أو Cron كل دقيقة.

المعالج:

- يأخذ دفعة محدودة.
- يستخدم `FOR UPDATE SKIP LOCKED`.
- يمنع عاملين من إرسال الرسالة نفسها.
- يزيد `attempts`.
- يستخدم Backoff.
- يضع `FAILED` بعد الحد الأقصى.
- لا يسجل محتوى حساساً.

نفس المشغّل ينفذ مهام الصيانة الدورية:

- حذف الحسابات غير الموثقة (`emailVerifiedAt IS NULL`) الأقدم من 24 ساعة، لتحرير البريد والرقم الوطني (راجع 7.2.1).
- حذف تحديات OTP المنتهية أو المستهلكة الأقدم من 24 ساعة.
- حذف توكنات `CitizenToken` المنتهية.
- تشغيل `reconcileBookedCount()` وتسجيل أي انحراف دون تعديل صامت.

مثال Cron:

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $OUTBOX_CRON_SECRET" \
  https://example.gov.sy/api/internal/process-notification-outbox
```

---

## 29. حدود الطلبات والحماية من الإساءة

لا تنسخ حدود موظفي الإدارة كما هي إلى المواطنين بسبب NAT وشبكات مزودات الاتصالات.

### 29.1 تسجيل الدخول

قيم افتراضية قابلة للتعديل:

```text
لكل بريد: 5 محاولات / 15 دقيقة
لكل IP: 200 محاولة / 15 دقيقة
```

القيد الحاسم على البريد، والـ IP حد واسع لمنع الهجمات العامة.

### 29.2 رمز البريد

```text
إرسال لكل حساب/بريد: 5 / ساعة
إرسال لكل IP: 100 / ساعة
فاصل إعادة الإرسال: 60 ثانية
محاولات الرمز: 5 لكل تحدٍ
صلاحية الرمز: 600 ثانية
```

### 29.3 التسجيل

حدّ «لكل بريد» و«لكل nationalIdHash» **لا يحمي من تعداد الأرقام الوطنية**: كل محاولة مسح تستخدم رقماً وطنياً مختلفاً وبريداً مختلفاً، فلا يمتلئ أي دلو. الضابط الفعال مختلف:

```text
لكل IP — محاولات تسجيل إجمالية: 50 / ساعة
لكل IP — عدد ردود "يوجد حساب موثق بهذا الرقم الوطني": 5 / ساعة
لكل بريد: 5 / ساعة   (يمنع إغراق شخص بعينه، لا التعداد)
لكل nationalIdHash: 5 / ساعة   (يمنع التكرار العابث على رقم واحد)
```

الحدّ الثاني هو الحاسم: مسار «الرقم الوطني مكرر» هو قناة التسريب الوحيدة، فيُحدّ **عدد الردود الكاشفة** لا عدد الطلبات. بعد استنفاده يعود المسار إلى الرد العام لبقية الساعة.

الحد المرتفع لكل IP مقصود: المواطنون خلف NAT مزودات الاتصالات السورية يخرجون من عناوين قليلة، وحدّ ضيق يقفل شريحة كاملة.

أضف CAPTCHA أو تحدياً إضافياً عند السلوك المريب، لا لكل المستخدمين منذ البداية.

### 29.4 قواعد عامة

- `verifyTrustedOrigin` للمسارات المغيرة.
- CSRF وفق بنية المشروع.
- حدود Body واضحة.
- لا logging للرموز وكلمات المرور والهوية.
- Hash للـ IP عند الاحتفاظ به، إذا لم تكن هناك حاجة قانونية لتخزينه صريحاً.

---

## 30. عدم التخزين المؤقت

مسارات السعة والحجز والحالة تستخدم:

```js
export const dynamic = "force-dynamic";
```

و/أو:

```http
Cache-Control: no-store
```

وينطبق ذلك على تنزيل الهوية المحمي ورمز التحقق وحالة الحساب.

---

## 31. الواجهات

## 31.1 المواطن

```text
/[locale]/account/register
/[locale]/account/verify-email
/[locale]/account/login
/[locale]/account/forgot
/[locale]/account/reset
/[locale]/account/profile
/[locale]/account/identity
/[locale]/account/bookings
/[locale]/account/bookings/[reference]/ticket
```

صفحة التحقق:

- إدخال 6 أرقام.
- عداد تنازلي مطابق لمدة الصلاحية المضبوطة.
- إعادة إرسال بعد 60 ثانية.
- دعم لصق الرمز.
- اتجاه صحيح RTL/LTR.

صفحة الحساب تعرض:

```text
البريد غير موثق
البريد موثق — الهوية لم ترفع
الهوية قيد المراجعة
تم رفض الهوية: السبب
الحساب موثق ويمكنك الحجز
```

## 31.2 صفحة الفعالية

- احجز مكانك.
- انضم لقائمة الانتظار.
- اكتملت الأماكن.
- التسجيل لم يبدأ.
- التسجيل مغلق.
- يلزم تسجيل الدخول.
- يلزم توثيق البريد.
- يلزم توثيق الهوية.
- رابط حجز خارجي.

## 31.3 الإدارة

```text
/admin/bookings
/admin/citizens
/admin/citizens/verifications
/admin/events/[id]/bookings
```

وظائف:

- إعداد السعة والنافذة والحالة.
- إغلاق الحجوزات الجديدة.
- إلغاء الفعالية مع سبب.
- إدارة قائمة الانتظار.
- الحجز اليدوي.
- الحضور.
- التصدير.
- قبول ورفض الهوية.
- حظر الحساب.

---

## 32. تقسيم المهام التنفيذي

> لكل مهمة: اختبار فاشل → تنفيذ → اختبار ناجح → مراجعة أمنية قصيرة.

### المرحلة أ — فصل الجلسات

#### المهمة 1: Audience للتوكنات

- تعديل `crypto.js`.
- تحديث CMS وGATE.
- اختبارات التقاطع والـ aud والخوارزمية.

#### المهمة 2: جلسة المواطن

- `citizen-session.js`.
- `citizen-dal.js`.
- `sessionVersion`.
- اختبار الحظر وتغيير كلمة المرور.

### المرحلة ب — تسوية قاعدة البيانات

#### المهمة 3: Bridge/Baseline

- نسخة احتياطية.
- نسخة تجريبية.
- توليد bridge **على جهاز التطوير المحلي** — `--from-migrations` يحتاج قاعدة ظل ولا يُشغَّل على خادم Plesk (راجع 13.2).
- اختبار قاعدة فارغة.
- `migrate resolve --applied` على القاعدة القائمة بعد التحقق.

#### المهمة 4: Migration الميزة

- Citizen — بلا `@unique` على `nationalIdHash`.
- OTP.
- Identity status.
- Event booking fields.
- Booking/attendance.
- Outbox.
- القيود، والفهرسان الجزئيان معاً:
  - `EventBooking_active_person_unique`
  - `Citizen_verified_national_id_unique`
- اختبار: إنشاء حسابين غير موثقين بالرقم الوطني نفسه ينجح؛ توثيق الثاني يفشل بـ `P2002` ويُترجم إلى رسالة مفهومة.

### المرحلة ج — الهوية والتخزين

#### المهمة 5: الرقم الوطني

- تطبيع.
- HMAC.
- آخر 4 خانات.
- اختبارات العربية/اللاتينية.

#### المهمة 6: تعميم التخزين الخاص

- استخراج `private-file-storage.mjs` من الوحدة القائمة.
- غلاف التراخيص.
- غلاف الهوية.
- تنزيل محمي وAudit Log.

### المرحلة د — البريد وOTP

#### المهمة 7: Mailer الوزارة

- **إعادة استخدام `src/lib/mailer.js` كما هو** — لا transport جديد ولا متغيرات بريد جديدة (راجع 16).
- التحقق من توثيق `SMTP_TLS_INSECURE` في `AGENTS.md` وقائمة النشر؛ بدونه لا يُرسل أي بريد على مُرحّل بشهادة منتهية.
- قالب رمز 6 أرقام عبر `wrapMinistryEmail`.
- المدة والفاصل وعدد المحاولات تُقرأ من البيئة، لا مثبتة في الكود.
- اختبار SMTP mock.

#### المهمة 8: خدمة OTP

```js
issueEmailOtp()
verifyEmailOtp()
resendEmailOtp()
revokeEmailOtps()
```

اختبارات:

- انتهاء الصلاحية عند الحد المضبوط في البيئة.
- خمس محاولات.
- إعادة الإرسال تبطل القديم.
- الرمز لا يظهر في DB أو logs.
- مقارنة بزمن ثابت.

#### المهمة 9: مسارات التسجيل والتفعيل

```text
register
verify-email
resend-email-code
login
logout
logout-all
forgot
reset
```

اختبارات إلزامية على مصيدة الرقم الوطني (راجع 7.2.1 و15.1.1):

- تسجيل بحساب غير موثق موجود بالرقم الوطني نفسه **ينجح**.
- تسجيل بالبريد نفسه غير الموثق يحدّث الصف القائم ويصدر رمزاً جديداً بدل إنشاء صف ثانٍ.
- تسجيل برقم وطني يملك حساباً **موثقاً** يُرفض ويوجّه إلى استعادة كلمة المرور.
- فشل SMTP عند التسجيل لا يترك الرقم الوطني محجوزاً: إعادة المحاولة تعمل.
- بعد 5 ردود «رقم وطني مكرر» من IP واحد، يعود المسار إلى الرد العام (راجع 29.3).

### المرحلة هـ — رفع ومراجعة الهوية

#### المهمة 10: رفع الهوية

- صورتان.
- Magic Bytes.
- 5 MB.
- تخزين خاص.
- `PENDING`.

#### المهمة 11: المراجعة

- قبول/رفض.
- سبب إلزامي.
- Audit Log.
- Outbox.

### المرحلة و — الحجز

#### المهمة 12: قواعد الحجز النقية

```js
bookingWindowState()
bookingOutcome()
remainingSpots()
canEnableInternalBooking()
citizenMayBook()
```

#### المهمة 13: طبقة الحجز

```js
createBooking()
cancelBooking()
promoteFromWaitlist()
syncCapacity()
reconcileBookedCount()
checkInBooking()
markNoShows()
cancelEventAndBookings()
```

- Event lock first.
- Idempotency.
- لا `lockedUntil` في أهلية الحجز.

#### المهمة 14: الرقم المرجعي

- إضافة `BOOKING: "BKG"` فقط.
- اختبار التزامن على المولّد الحالي.

#### المهمة 15: اختبارات التزامن

- 50 طلباً وسعة 10.
- 20 طلباً للشخص نفسه.
- إلغاء وترقية.
- إلغاءان متزامنان.
- إنشاء وإلغاء متزامنان.
- تعديل سعة وإلغاء متزامنان.

### المرحلة ز — الإدارة والواجهات

#### المهمة 16: حذف وإلغاء الفعالية

- تعديل مسار الحذف القائم.
- 409 عند وجود حجوزات.
- إلغاء مركزي مع Outbox.

#### المهمة 17: API المواطن

- حجز.
- إلغاء.
- حجوزاتي.
- حالة عامة مجمعة.
- no-store.

#### المهمة 18: API الإدارة

- إعداد الحجز.
- الإغلاق.
- الحجوزات.
- اليدوي.
- الحضور.
- التصدير.
- المواطنين والهوية.

#### المهمة 19: الواجهات

- OTP.
- الحساب والهوية.
- صفحة الفعالية.
- حجوزاتي والتذكرة.
- لوحة الحجوزات.

### المرحلة ح — التشغيل

#### المهمة 20: Outbox Cron

- Endpoint داخلي محمي.
- Plesk Scheduled Task.
- locking وbackoff.
- منع التكرار.

#### المهمة 21: المصالحة

- `reconcileBookedCount()`.
- تقرير الانحرافات.
- لا إصلاح صامت دون سياسة.

### المرحلة ط — التحقق والنشر

#### المهمة 22: الاختبارات والبناء

- جميع `node --test` ناجحة.
- `npm run build` ناجح.
- تجربة كاملة.

#### المهمة 23: النشر

- Backup.
- env.
- migrate deploy.
- Cron.
- اختبار SMTP.
- تنبيه خروج الموظفين لمرة واحدة.
- خطة Rollback.

---

## 33. متغيرات البيئة النهائية

```env
# أسرار الجلسات والهوية
SESSION_SECRET=
CITIZEN_ID_PEPPER=
CITIZEN_OTP_SECRET=
BOOKING_TICKET_SECRET=

# رابط موثوق للخادم
APP_BASE_URL=https://example.gov.sy

# بريد وزارة الثقافة — أسماء قائمة في src/lib/mailer.js، لا تخترع بدائل
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@moc.gov.sy
# إلزامي إن كان مُرحّل بريد الوزارة يحمل شهادة منتهية أو موقّعة ذاتياً.
# بدونه لا يُرسل أي بريد على الإطلاق — راجع القسم 16.
SMTP_TLS_INSECURE=false

# OTP
CITIZEN_EMAIL_OTP_TTL_SECONDS=600
CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS=60
CITIZEN_EMAIL_OTP_MAX_ATTEMPTS=5

# التخزين الخاص المحلي
PRIVATE_UPLOAD_DIR=

# Outbox والصيانة الدورية
OUTBOX_CRON_SECRET=
OUTBOX_BATCH_SIZE=50
UNVERIFIED_CITIZEN_TTL_HOURS=24

# الاختبارات
DATABASE_URL_TEST=
```

لا تستخدم السر نفسه لأكثر من غرض.

لا تستخدم `NEXT_PUBLIC_SITE_URL` كمصدر أمني لبناء الروابط. إن احتاجت الواجهة قيمة عامة، يمكن توفيرها منفصلة، لكن الخادم يعتمد `APP_BASE_URL` حصراً.

---

## 34. استراتيجية الاختبار

## 34.1 قاعدة مستقلة

- `DATABASE_URL_TEST` إلزامي.
- حماية تمنع التنظيف إذا بدا الرابط إنتاجياً.
- PostgreSQL حقيقية لا mocks فقط لاختبارات التزامن.

## 34.2 OTP والبريد

- الرمز 6 خانات حتى مع أصفار البداية.
- الرمز ينتهي بعد `CITIZEN_EMAIL_OTP_TTL_SECONDS`.
- عند الثانية الأخيرة بالضبط يعد منتهياً.
- المدة تُقرأ من البيئة ولا تكون مثبتة في الكود.
- خمس محاولات خاطئة تبطله.
- الرمز القديم لا يعمل بعد إعادة الإرسال.
- الرمز لا يظهر في الصف أو logs.
- تحدٍ لغرض مختلف لا يعمل.
- SMTP failure يبطل التحدي غير المرسل.
- الرد لا يكشف وجود البريد.

## 34.3 الجلسات

- Citizen token لا يفتح admin.
- CMS token لا يعمل كمواطن.
- تغيير كلمة المرور يبطل الجلسة.
- lock يمنع login جديد فقط.
- جلسة صالحة تبقى مؤهلة للحجز رغم `lockedUntil` الذي نتج عن محاولات خارجية.

## 34.4 الهوية

- لا رفع قبل البريد.
- رفض امتداد مزيف.
- رفض أكبر من 5 MB.
- الملفات ليست عامة.
- تنزيل بلا صلاحية يفشل.
- التنزيل يسجل Audit Log.
- إعادة الرفع بعد الرفض تعمل.

## 34.5 الحجز

- لا حجز دون جلسة.
- لا حجز قبل البريد.
- لا حجز قبل الهوية.
- لا تجاوز للسعة.
- حجز نشط واحد للشخص.
- الحضور لا يحرر مكاناً.
- `EDITOR` لا يرى الحجوزات.
- الحجز اليدوي يحتاج رقماً وطنياً وسبباً.
- لا تجاوز للسعة يدوياً.
- حذف فعالية ذات حجوزات يرجع 409.
- إلغاء الفعالية يلغي الحجوزات ويرسل Outbox مرة واحدة.

## 34.6 Deadlock والتزامن

- Event lock أولاً في كل المسارات.
- اختبارات عمليات مختلطة.
- لا نقصان مزدوج للعداد.
- لا ترقية شخصين للمكان نفسه.

## 34.7 Migrations

- قاعدة فارغة تصل للمخطط النهائي.
- نسخة إنتاج تجريبية تقبل deploy دون reset.
- bridge مسجل بشكل صحيح.
- لا Drift بعد deploy.

---

## 35. سيناريو القبول الكامل

1. المواطن يفتح التسجيل.
2. يدخل البيانات.
3. النظام يولد رمزاً من 6 أرقام.
4. حساب بريد الوزارة يرسل الرمز.
5. المواطن يدخله خلال 10 دقائق.
6. النظام يفعّل البريد وينشئ جلسة تلقائياً.
7. المواطن يرفع وجهي الهوية.
8. تظهر الحالة `PENDING`.
9. يستطيع الدخول والتصفح ولا يستطيع الحجز.
10. الموظف المخول ينزل الصور المحمية ويراجعها.
11. يقبل الهوية.
12. تصل رسالة القبول.
13. المواطن يحجز فعالية مفتوحة.
14. يحصل على رقم `BKG` وتذكرة.
15. تمتلئ السعة ويدخل آخرون الانتظار.
16. يُلغى حجز مؤكد.
17. يرقّى أقدم منتظر.
18. Cron يرسل رسالة الترقية.
19. يسجل الحضور دون تغيير حالة الحجز.
20. محاولة حجز ثانية للشخص نفسه تُمنع.
21. إلغاء الفعالية يلغي الحجوزات ويحفظ السجل.
22. محاولة حذف الفعالية الملغاة مع حجوزات تاريخية ترجع 409.
23. `reconcileBookedCount()` يعيد صفر انحرافات.

---

## 36. قائمة القبول النهائية

| # | الشرط | طريقة التحقق |
|---|---|---|
| 1 | جلسة المواطن لا تفتح الإدارة | اختبارات Audience |
| 2 | رمز البريد يولد تلقائياً من الخادم | اختبار `crypto.randomInt` ومسار التسجيل |
| 3 | الرمز يرسل من حساب الوزارة | SMTP integration test |
| 4 | الرمز صالح 10 دقائق ومدته من البيئة | اختبارات الزمن |
| 5 | الرمز لا يخزن صريحاً | فحص DB وlogs |
| 6 | إعادة الإرسال تبطل القديم | اختبار OTP |
| 7 | خمس محاولات تبطل التحدي | اختبار OTP |
| 8 | مصدر البريد من env فقط | فحص الإعدادات |
| 9 | روابط الخادم من `APP_BASE_URL` فقط | اختبار Host poisoning |
| 10 | تسجيل الدخول قبل الهوية متاح | حالة `PENDING` تدخل الحساب |
| 11 | لا حجز قبل البريد والهوية | 403 |
| 12 | `lockedUntil` لا يمنع جلسة صالحة من الحجز | اختبار منع الخدمة |
| 13 | الرقم الوطني لا يخزن صريحاً | فحص DB وlogs |
| 14 | الصور خارج public | محاولة رابط مباشر تفشل |
| 15 | التخزين يعيد استخدام الوحدة القائمة | مراجعة الكود |
| 16 | لا اعتماد على S3 | env والمخطط |
| 17 | شخص واحد لا يملك حجزين نشطين | الفهرس الجزئي |
| 18 | لا تجاوز للسعة | اختبار 50 طلباً |
| 19 | Event يقفل أولاً | اختبارات Deadlock |
| 20 | الحضور منفصل عن الحجز | schema واختبار |
| 21 | حذف فعالية ذات حجوزات يرجع 409 | API test |
| 22 | إلغاء الفعالية يحدد مصير الحجوزات | transaction test |
| 23 | Editor لا يرى بيانات الحضور | permission test |
| 24 | الحجز اليدوي يطلب الرقم الوطني | validation test |
| 25 | الرقم المرجعي يستخدم المولد الحالي | code review |
| 26 | Outbox له Cron فعلي | Plesk/cron verification |
| 27 | التاريخ migration قابل للبناء من الصفر | clean DB test |
| 28 | deploy لا يطلب reset | staging clone test |
| 29 | بيانات السعة no-store | response headers |
| 30 | كل فتح هوية مسجل | Audit Log test |
| 31 | خطأ إملائي في البريد لا يحرق الرقم الوطني | تسجيل ببريد خاطئ ثم إعادة تسجيل بالصحيح تنجح |
| 32 | فشل SMTP لا يمنع إعادة المحاولة | mock فاشل ثم إعادة تسجيل بالبريد نفسه |
| 33 | حسابان غير موثقين لا يتوثقان بالرقم نفسه | الفهرس الجزئي + إعادة الفحص في معاملة التحقق |
| 34 | حدود التسجيل تحدّ الردود الكاشفة لا الطلبات | اختبار 6 محاولات «رقم مكرر» من IP واحد |
| 35 | `SMTP_TLS_INSECURE` موثق في قائمة النشر | مراجعة AGENTS.md و.env |
| 36 | لا `SMTP_SECURE` ولا `MINISTRY_MAIL_*` في الكود أو env | grep على المستودع |
| 37 | الحسابات غير الموثقة تُنظَّف دورياً | اختبار مهمة الصيانة |

---

## 37. خارج نطاق الإصدار الأول

- مقاعد مرقمة وخرائط قاعات.
- الدفع الإلكتروني.
- تسجيل الدخول الاجتماعي.
- المصادقة الثنائية الكاملة.
- ربط حكومي للتحقق من الرقم الوطني.
- مطابقة الوجه بالذكاء الاصطناعي.
- إزالة EXIF وإعادة ترميز الصور بـ `sharp`.
- QR متقدم إن لم يعتمد في النسخة الأولى.
- تجاوز السعة يدوياً.
- تطبيق موبايل مستقل.

---

## 38. التدفق النهائي المعتمد

```text
إنشاء حساب
↓
توليد رمز 6 أرقام في الخادم
↓
إرساله من حساب بريد وزارة الثقافة المحدد في .env
↓
إدخال الرمز خلال 10 دقائق
↓
توثيق البريد وإنشاء جلسة مواطن
↓
رفع الهوية الأمامية والخلفية
↓
مراجعة إدارية
↓
اعتماد الهوية
↓
السماح بالحجز
↓
تذكرة ورقم مرجعي
↓
إدارة قائمة الانتظار والحضور والإلغاء
```

شرط الحجز النهائي:

```text
جلسة مواطن صالحة
+ emailVerifiedAt موجود
+ identityStatus = VERIFIED
+ isActive = true
+ isBlocked = false
```

لا يدخل `lockedUntil` في الشرط.

هذه النسخة تعالج جميع الملاحظات الحرجة: حذف الفعالية، منع الخدمة عبر قفل الدخول، ترتيب الأقفال، التخزين المحلي القائم، تاريخ migrations، Outbox الفعلي، حدود NAT، إلغاء الفعاليات، مصادر الحقيقة، حماية الروابط، الصلاحيات، والحجز الإداري اليدوي، بالإضافة إلى تفعيل البريد برمز آمن من 6 أرقام عبر حساب وزارة الثقافة.
