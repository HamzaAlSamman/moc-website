import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyTrustedOrigin } from "./csrf";

const MAX_AUTH_JSON_BYTES = 16 * 1024;

export function citizenJson(payload, status = 200, headers = {}) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function requireCitizenAuthOrigin(request) {
  return verifyTrustedOrigin(request)
    ? null
    : citizenJson({ error: "طلب غير موثوق" }, 403);
}

export async function readCitizenAuthJson(request) {
  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_AUTH_JSON_BYTES) {
      const error = new Error("REQUEST_TOO_LARGE");
      error.status = 413;
      throw error;
    }
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_AUTH_JSON_BYTES) {
    const error = new Error("REQUEST_TOO_LARGE");
    error.status = 413;
    throw error;
  }
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
  return parsed;
}

export function hashCitizenRequestValue(value) {
  return createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
}

export function citizenAuthErrorResponse(error) {
  if (error?.status === 413) return citizenJson({ error: "الطلب كبير جداً" }, 413);
  const mapping = {
    AUTH_INVALID_INPUT: [400, "البيانات المدخلة غير صالحة"],
    AUTH_INVALID: [401, "بيانات الدخول غير صحيحة"],
    AUTH_LOCKED: [429, "محاولات كثيرة، يرجى المحاولة لاحقاً"],
    AUTH_REQUIRED: [401, "يلزم تسجيل الدخول"],
    AUTH_UNAVAILABLE: [409, "تعذر إكمال الطلب"],
    EMAIL_UNVERIFIED: [403, "يجب تفعيل البريد الإلكتروني أولاً"],
    OTP_INVALID: [400, "رمز التحقق غير صالح"],
    OTP_EXPIRED: [400, "انتهت صلاحية رمز التحقق"],
    OTP_RESEND_COOLDOWN: [429, "يرجى الانتظار قبل إعادة الإرسال"],
    NATIONAL_ID_VERIFIED: [409, "يوجد حساب موثق بهذا الرقم الوطني"],
    NATIONAL_ID_PENDING: [409, "يوجد تسجيل قيد الانتظار بهذا الرقم الوطني. أكمِل تفعيل بريدك أو حاول لاحقاً."],
    RESET_INVALID: [400, "رابط إعادة التعيين غير صالح أو منتهي"],
    PASSWORD_WEAK: [400, "كلمة المرور لا تستوفي الشروط الأمنية"],
  };
  const [status, fallbackMessage] = mapping[error?.code] ?? [500, "حدث خطأ في الخادم"];
  const message = error?.code === "PASSWORD_WEAK" && error.errors?.length
    ? error.errors.join(" • ")
    : fallbackMessage;
  const headers = error?.retryAfterSeconds
    ? { "Retry-After": String(error.retryAfterSeconds) }
    : {};
  return citizenJson({ error: message, code: error?.code }, status, headers);
}
