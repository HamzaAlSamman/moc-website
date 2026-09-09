import { CitizenAuthError, loginCitizen } from "@/lib/citizen-auth";
import { citizenAuthErrorResponse, citizenJson, readCitizenAuthJson, requireCitizenAuthOrigin } from "@/lib/citizen-auth-route";
import { normalizeEmail } from "@/lib/citizen-identity.mjs";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Every credential attempt lands in the AuditLog so a later investigation has
// something to read even after the account is deleted (citizen rows and their
// OTP/session history cascade away on deletion, so this trail is the only
// record that survives). Deliberately recorded: the attempted email, the
// client IP, the outcome, and — on failure — the reason code. Never the
// password. Writes are best-effort inside logAudit; an audit failure must not
// block or slow a real login.
async function audit(action, { email, ip, citizenId = null, code = null }) {
  await logAudit({
    action,
    // No FK on actorId; prefix so citizen ids never collide with admin user
    // ids sharing this column. Unknown on a failed attempt by design — the
    // attempted email is the identifier there.
    actorId: citizenId ? `citizen:${citizenId}` : "citizen:unauthenticated",
    actorEmail: email,
    targetId: citizenId,
    ipAddress: ip,
    metadata: code ? { code } : null,
  });
}

export async function POST(request) {
  const originError = requireCitizenAuthOrigin(request);
  if (originError) return originError;
  const ip = getClientIp(request);
  if (!rateLimit(`citizen-login:ip:${ip}`, 200, 15 * 60 * 1000)) {
    return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
  }
  let email = "";
  try {
    const body = await readCitizenAuthJson(request);
    email = normalizeEmail(body.email);
    if (!rateLimit(`citizen-login:email:${email}`, 5, 15 * 60 * 1000)) {
      // A per-email throttle trip is itself a brute-force signal worth keeping.
      await audit("CITIZEN_LOGIN_THROTTLED", { email, ip });
      return citizenJson({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, 429);
    }
    let result;
    try {
      result = await loginCitizen(body);
    } catch (error) {
      const code = error instanceof CitizenAuthError ? error.code : "ERROR";
      await audit("CITIZEN_LOGIN_FAILED", { email, ip, code });
      throw error;
    }
    await audit("CITIZEN_LOGIN_SUCCESS", { email, ip, citizenId: result.citizenId });
    return citizenJson(result);
  } catch (error) {
    return citizenAuthErrorResponse(error);
  }
}
