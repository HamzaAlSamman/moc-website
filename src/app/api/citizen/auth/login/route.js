import { loginCitizen } from "@/lib/citizen-auth";
import { citizenAuthErrorResponse, citizenJson, readCitizenAuthJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { normalizeEmail } from "@/lib/citizen-identity.mjs";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  const ip = getClientIp(request);
  if (!rateLimit(`citizen-login:ip:${ip}`, 200, 15 * 60 * 1000)) {
    return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
  }
  try {
    const body = await readCitizenAuthJson(request);
    const email = normalizeEmail(body.email);
    if (!rateLimit(`citizen-login:email:${email}`, 5, 15 * 60 * 1000)) {
      return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
    }
    return citizenJson(await loginCitizen(body));
  } catch (error) {
    return citizenAuthErrorResponse(error);
  }
}
