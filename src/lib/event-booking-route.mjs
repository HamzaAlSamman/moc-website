const BOOKING_FIELDS = [
  "id",
  "referenceNo",
  "eventId",
  "fullName",
  "nationalIdLast4",
  "email",
  "phone",
  "status",
  "attendanceStatus",
  "source",
  "ticketSig",
  "cancelledAt",
  "cancellationReason",
  "promotedAt",
  "checkedInAt",
  "createdAt",
  "updatedAt",
];

export function citizenBookingPayload(booking) {
  const result = {};
  for (const field of BOOKING_FIELDS) {
    if (booking?.[field] !== undefined) result[field] = booking[field];
  }
  if (booking?.idempotent !== undefined) result.idempotent = booking.idempotent;
  return result;
}

export function citizenBookingError(error) {
  const mapping = {
    AUTH_REQUIRED: [401, "يلزم تسجيل الدخول"],
    EMAIL_UNVERIFIED: [403, "يجب تفعيل البريد الإلكتروني أولاً"],
    IDENTITY_UNVERIFIED: [403, "يجب توثيق الهوية قبل الحجز"],
    ACCOUNT_UNAVAILABLE: [403, "الحساب غير متاح"],
    EVENT_NOT_FOUND: [404, "الفعالية غير موجودة"],
    BOOKING_NOT_FOUND: [404, "الحجز غير موجود"],
    BOOKING_FORBIDDEN: [403, "غير مصرح بهذا الحجز"],
    EVENT_FULL: [409, "اكتملت سعة الفعالية"],
    EVENT_UNAVAILABLE: [409, "الفعالية غير متاحة للحجز"],
    EXTERNAL_BOOKING_ONLY: [409, "الحجز متاح عبر الجهة الخارجية فقط"],
    BOOKING_DISABLED: [409, "الحجز الداخلي غير مفعّل"],
    BOOKING_CLOSED: [409, "الحجز مغلق"],
    BOOKING_NOT_OPEN_YET: [409, "لم تفتح نافذة الحجز بعد"],
  };
  const [status, message] = mapping[error?.code] ?? [500, "حدث خطأ في الخادم"];
  return { status, body: { error: message, code: error?.code } };
}
