import { verifyCitizenEmail } from "@/lib/citizen-auth";
import { citizenAuthErrorResponse, citizenJson, readCitizenAuthJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  const ip = getClientIp(request);
  if (!rateLimit(`citizen-verify-email:ip:${ip}`, 50, 15 * 60 * 1000)) {
    return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
  }
  try {
    return citizenJson(await verifyCitizenEmail(await readCitizenAuthJson(request)));
  } catch (error) {
    return citizenAuthErrorResponse(error);
  }
}
