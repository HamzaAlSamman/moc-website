import { forgotCitizenPassword } from "@/lib/citizen-auth";
import { citizenJson, readCitizenAuthJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  const ip = getClientIp(request);
  try {
    const body = await readCitizenAuthJson(request);
    if (rateLimit(`citizen-forgot:ip:${ip}`, 50, 60 * 60 * 1000)) {
      await forgotCitizenPassword(body);
    }
  } catch (error) {
    // The response stays deliberately indistinguishable for missing accounts,
    // invalid input, and SMTP failures — but the server still logs, otherwise a
    // misconfiguration (missing base URL, dead SMTP) is completely invisible.
    console.error("Citizen forgot-password error:", error);
  }
  return citizenJson({ accepted: true });
}
