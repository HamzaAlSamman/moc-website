import { getCitizenSession } from "@/lib/citizen-session";
import { submitCitizenIdentity } from "@/lib/citizen-identity-submission";
import {
  CITIZEN_IDENTITY_MAX_FILE_BYTES,
  CITIZEN_IDENTITY_UPLOAD_HTTP_OVERHEAD_BYTES,
} from "@/lib/citizen-identity-storage.mjs";
import { requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function uploadError(error) {
  const mapping = {
    AUTH_REQUIRED: [401, "يلزم تسجيل الدخول"],
    ACCOUNT_UNAVAILABLE: [403, "الحساب غير متاح"],
    EMAIL_UNVERIFIED: [403, "يجب تفعيل البريد الإلكتروني أولاً"],
    IDENTITY_ALREADY_PENDING: [409, "الهوية قيد المراجعة بالفعل"],
    IDENTITY_ALREADY_VERIFIED: [409, "الهوية موثقة بالفعل"],
    IDENTITY_STATE_CHANGED: [409, "تغيرت حالة الهوية، يرجى تحديث الصفحة"],
    IDENTITY_INVALID_FILE: [400, "يجب رفع صورتين صالحتين بصيغة JPEG أو PNG أو WebP وبحجم لا يتجاوز 5MB"],
    IDENTITY_STORAGE_FAILED: [500, "تعذر حفظ الصور"],
  };
  const [status, message] = mapping[error?.code] ?? [500, "حدث خطأ في الخادم"];
  return json({ error: message, code: error?.code }, status);
}

function validUploadFile(value) {
  return value && typeof value.arrayBuffer === "function" && typeof value.type === "string";
}

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;

  const session = await getCitizenSession();
  if (!session?.citizenId || !Number.isSafeInteger(session.sessionVersion)) {
    return json({ error: "يلزم تسجيل الدخول", code: "AUTH_REQUIRED" }, 401);
  }

  const ip = getClientIp(request);
  if (
    !rateLimit(`citizen-identity-submit:ip:${ip}`, 30, 60 * 60 * 1000)
    || !rateLimit(`citizen-identity-submit:citizen:${session.citizenId}`, 10, 60 * 60 * 1000)
  ) return json({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);

  const maxRequestBytes = 2 * CITIZEN_IDENTITY_MAX_FILE_BYTES
    + CITIZEN_IDENTITY_UPLOAD_HTTP_OVERHEAD_BYTES;
  const rawLength = request.headers.get("content-length");
  const contentLength = Number(rawLength);
  if (!rawLength || !Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > maxRequestBytes) {
    return json({ error: "حجم طلب الصور غير صالح أو كبير جداً" }, 413);
  }

  try {
    const form = await request.formData();
    const front = form.get("front");
    const back = form.get("back");
    if (!validUploadFile(front) || !validUploadFile(back)) {
      return json({ error: "صورتا الوجه الأمامي والخلفي مطلوبتان" }, 400);
    }
    if (front.size > CITIZEN_IDENTITY_MAX_FILE_BYTES || back.size > CITIZEN_IDENTITY_MAX_FILE_BYTES) {
      return json({ error: "حجم كل صورة يجب ألا يتجاوز 5MB" }, 413);
    }

    const [frontBytes, backBytes] = await Promise.all([
      front.arrayBuffer().then((bytes) => Buffer.from(bytes)),
      back.arrayBuffer().then((bytes) => Buffer.from(bytes)),
    ]);
    const result = await submitCitizenIdentity({
      citizenId: session.citizenId,
      sessionVersion: session.sessionVersion,
      front: { bytes: frontBytes, declaredMimeType: front.type },
      back: { bytes: backBytes, declaredMimeType: back.type },
    });
    return json({ success: true, ...result });
  } catch (error) {
    return uploadError(error);
  }
}
