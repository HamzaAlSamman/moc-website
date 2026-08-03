import { resendCitizenEmail } from "@/lib/citizen-auth";
import { citizenAuthErrorResponse, citizenJson, hashCitizenRequestValue, readCitizenAuthJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  const ip = getClientIp(request);
  if (!rateLimit(`citizen-resend:ip:${ip}`, 100, 60 * 60 * 1000)) {
    return citizenJson({ accepted: true }, 202);
  }
  try {
    const body = await readCitizenAuthJson(request);
    if (!rateLimit(`citizen-resend:challenge:${body.challengeId}`, 5, 60 * 60 * 1000)) {
      return citizenJson({ accepted: true }, 202);
    }
    const result = await resendCitizenEmail({
      ...body,
      ipHash: hashCitizenRequestValue(ip),
      userAgentHash: hashCitizenRequestValue(request.headers.get("user-agent")),
    });
    return citizenJson({ accepted: true, challengeId: result.challengeId });
  } catch (error) {
    return citizenAuthErrorResponse(error);
  }
}
