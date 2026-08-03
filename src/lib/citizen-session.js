import "server-only";
import { cookies } from "next/headers";
import { TOKEN_AUDIENCE, encryptFor, decryptFor } from "./crypto";

// Deliberately a different cookie name from the CMS's "cms-session" so the
// two can never collide or be read by code that grabbed the wrong cookie by
// mistake — on top of the audience check crypto.js already enforces.
export const CITIZEN_SESSION_COOKIE = "citizen-session";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Signs and sets the citizen session cookie.
 *
 * The payload is intentionally minimal: `citizenId` and `sessionVersion`
 * only. Never add `userId` or `role` here — those are CMS-session concepts,
 * and a citizen token must not be structurally confusable with a staff one
 * even by code that forgets to check the audience.
 *
 * `sessionVersion` is a snapshot of the value on the Citizen row at sign-in
 * time. Every citizen-facing read re-fetches the row and compares versions,
 * so bumping the DB column (password change, "log out everywhere", an
 * admin block) invalidates every outstanding token immediately — there is
 * no server-side session store to purge.
 */
export async function createCitizenSession(citizenId, sessionVersion) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encryptFor(TOKEN_AUDIENCE.CITIZEN, {
    citizenId,
    sessionVersion,
    expiresAt,
  });
  const cookieStore = await cookies();

  cookieStore.set(CITIZEN_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getCitizenSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(CITIZEN_SESSION_COOKIE)?.value;
  return decryptFor(TOKEN_AUDIENCE.CITIZEN, session);
}

export async function deleteCitizenSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CITIZEN_SESSION_COOKIE);
}
