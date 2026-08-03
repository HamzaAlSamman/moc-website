import { registerCitizen } from "@/lib/citizen-auth";
import { citizenAuthErrorResponse, citizenJson, readCitizenAuthJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { hashNationalId, isValidNationalId, normalizeEmail, normalizeNationalId } from "@/lib/citizen-identity.mjs";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  const ip = getClientIp(request);
  if (!rateLimit(`citizen-register:ip:${ip}`, 50, 60 * 60 * 1000)) {
    return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
  }
  try {
    const body = await readCitizenAuthJson(request);
    const email = normalizeEmail(body.email);
    const nationalId = normalizeNationalId(body.nationalId);
    if (email && !rateLimit(`citizen-register:email:${email}`, 5, 60 * 60 * 1000)) {
      return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
    }
    if (isValidNationalId(nationalId)) {
      const nationalHash = hashNationalId(nationalId);
      if (!rateLimit(`citizen-register:national:${nationalHash}`, 5, 60 * 60 * 1000)) {
        return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
      }
    }
    const result = await registerCitizen(body);
    return citizenJson({ success: true, ...result }, 201);
  } catch (error) {
    if (error?.code === "NATIONAL_ID_VERIFIED") {
      if (!rateLimit(`citizen-register:national-disclosure:${ip}`, 5, 60 * 60 * 1000)) {
        return citizenJson({ accepted: true }, 202);
      }
      return citizenJson({
        error: "يوجد حساب موثق بهذا الرقم الوطني",
        code: error.code,
        recover: "forgot-password",
      }, 409);
    }
    return citizenAuthErrorResponse(error);
  }
}
