# خطة ربط دار الأوبرا ← وزارة الثقافة (مزامنة الفعاليات + الحجز)

> **آخر تحديث:** 2026-07-19
> **القرار المعتمد:** الفعاليات القادمة من الأوبرا تظهر **مباشرة** على الروزنامة (`reviewStatus = APPROVED`)، بلا مراجعة يدوية.

---

## 1. الفكرة المعمارية

- الاتجاه واحد: **الأوبرا تدفع (push)** الفعالية لوزارة الثقافة عبر HTTP API عند كل حفظ/تعديل/حذف.
- الوزارة تخزّن الفعالية في موديل `Event` نفسه (الروزنامة الثقافية) مع رابط حجز يرجّع لموقع الأوبرا.
- **مصدر الحقيقة = الأوبرا.** الوزارة نسخة معروضة فقط؛ المزامنة لا تُعطّل حفظ الأوبرا إذا فشلت.
- الحجز يبقى بالكامل على موقع الأوبرا (اختيار المقاعد/الدفع)؛ الوزارة تعرض بوستر + زر «احجز».

```
[لوحة تحكم الأوبرا]
   upsertEvent() / deleteEvent()   (web/src/app/actions/admin.ts)
        │  بعد الحفظ المحلي بنجاح
        ▼
  syncEventToMoc()  ── POST/DELETE ──►  [MOC] /api/integrations/opera/events
   (web/src/lib/moc-sync.ts)              (Bearer OPERA_SYNC_SECRET)
                                              │ upsert على Event (source=OPERA)
                                              ▼
                                        الروزنامة العامة GET /api/events
                                          + زر «احجز» → damascusopera.sy/events/{slug}
```

---

## 2. المعطيات المرجعية

| | دار الأوبرا (المصدر) | وزارة الثقافة (الوجهة) |
|---|---|---|
| المسار | `F:\تطبيقات انا عم اعملها\دار الأوبرا\web` | `F:\تطبيقات انا عم اعملها\MOC\moc-website` |
| الدومين العام | `https://damascusopera.sy` (`web/src/lib/seo.ts`) | `NEXT_PUBLIC_APP_URL` |
| نقطة إنشاء/تعديل الفعالية | `upsertEvent()` / `deleteEvent()` في `src/app/actions/admin.ts` | `POST /api/admin/events` |
| الروزنامة العامة | — | `GET /api/events` (يرجّع `reviewStatus: APPROVED` فقط) |
| Prisma / DB | Prisma 7 + pg + PostgreSQL | Prisma 6 + PostgreSQL (migrations) |

### تحويل الحقول (Opera → MOC)
| الأوبرا | الوزارة | ملاحظة |
|---|---|---|
| `id` | `externalId` | مفتاح المزامنة |
| `title` / `titleEn` | `titleAr` / `titleEn` | |
| `description` / `descriptionEn` | `descriptionAr` / `descriptionEn` | بعد `sanitizeRichText` |
| `startsAt` | `startDate` | لا يوجد `endDate` بالأوبرا → `null` |
| `poster` | `featuredImage` | صورة الحجز المعروضة |
| `venue.name` | `location` | |
| ثابت `"دمشق"` | `governorate` | دار الأوبرا بدمشق |
| `SITE_URL + "/events/" + slug` | `bookingUrl` | رابط الحجز |

### تحويل الحالات (Opera → MOC)
| الأوبرا | الوزارة |
|---|---|
| `UPCOMING` / `LIMITED` / `SOLD_OUT` | `UPCOMING` |
| `PAST` | `COMPLETED` |
| `CLOSED` | `CANCELLED` |

---

## 3. المراحل

### المرحلة 1 — قاعدة الوزارة + نقطة الاستقبال ✅ (قيد التنفيذ)
1. `schema.prisma`: إضافة `source` / `externalId` / `bookingUrl` / `syncedAt` + `@@unique([source, externalId])` على `Event`.
2. Migration جديدة.
3. `POST` + `DELETE` على `/api/integrations/opera/events` مع مصادقة Bearer (`OPERA_SYNC_SECRET`) ومقارنة ثابتة الزمن، وتحقّق `zod`، وتعقيم النصوص، و`upsert` idempotent.
4. env: `OPERA_SYNC_SECRET`.

### المرحلة 2 — الدفع من الأوبرا ✅ (منجزة)
5. `web/src/lib/moc-sync.ts`: دالة تحويل + `fetch` لنقطة الوزارة، مغلّفة try/catch (لا تكسر حفظ الأوبرا)، no-op عند غياب env، مهلة 8s.
6. مربوطة بـ `upsertEvent()` (POST) و`deleteEvent()` (DELETE → CANCELLED) في `web/src/app/actions/admin.ts`.
7. env على الأوبرا: `MOC_API_URL` + `OPERA_SYNC_SECRET` (في `web/.env`؛ للإنتاج تُضبط على السيرفر).

### المرحلة 3 — عرض الحجز عند الوزارة ✅ (منجزة)
8. أُضيف `bookingUrl` + `source` إلى `select` في `GET /api/events`.
9. في `CulturalCalendarSection.jsx` (مودال تفاصيل الفعالية): زر «احجز الآن» يظهر عند وجود `bookingUrl` ويفتح الرابط في تبويب جديد (`target="_blank" rel="noopener noreferrer"`).
10. **إصلاح لازم:** أُضيف `damascusopera.sy` (و`**.damascusopera.sy`) إلى `images.remotePatterns` في `next.config.mjs` — بدونه يرفض `next/image` بوستر الأوبرا فلا تُعرض البطاقة. (يتطلب إعادة تشغيل الخادم.)

> ملاحظة تحقّق: التقويم يختار **اليوم الحالي** افتراضياً ويعرض فعاليات ذلك اليوم فقط؛ فعاليات الأوبرا تظهر في يومها أو عبر «عرض الكل» — هذا سلوك التقويم الطبيعي.

### المرحلة 4 — المتانة (اختياري)
10. زر «إعادة مزامنة» + معالجة فشل الشبكة على لوحة الأوبرا (صفوف `syncedAt = null`).

### المرحلة 5 — النشر
11. نشر الوزارة ثم الأوبرا، ضبط env على السيرفرين، اختبار من طرف لطرف.

---

## 4. الأمان
- سرّ مشترك `OPERA_SYNC_SECRET` عبر `Authorization: Bearer` فوق HTTPS، مقارنة `timingSafeEqual`.
- نقطة الاستقبال تعمل فقط على `source: "OPERA"` ولا تمسّ فعاليات الوزارة الداخلية.
- تعقيم كل نص وارد (`sanitizeRichText`) + تحقّق `zod`.
- rate-limit على نقطة الاستقبال.

## 5. الحالات الحدّية
- **idempotency:** `@@unique([source, externalId])` + `upsert`.
- **تعديل بالأوبرا:** يحدّث السجل، دون لمس `reviewStatus`.
- **حذف/إغلاق:** → `CANCELLED` (soft delete)، لا حذف فيزيائي.
- **فشل الشبكة:** الحفظ المحلي بالأوبرا ينجح؛ الفشل يُسجَّل فقط (إعادة المحاولة = المرحلة 4).

## 6. الاختبار
- إنشاء فعالية بالأوبرا → تظهر مباشرة على روزنامة الوزارة ببوستر وزر «احجز».
- الزر يفتح صفحة حجز الأوبرا الصحيحة.
- تعديل العنوان بالأوبرا → يتحدّث بلا تكرار.
- حذف بالأوبرا → يصير `CANCELLED`.
- مفتاح خاطئ → `401`.
