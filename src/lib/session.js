import "server-only";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "./crypto";

export { encrypt, decrypt };

export async function createSession(userId, role, mustChangePassword = false) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // `mustChangePassword` travels inside the signed JWT itself (not just the DB)
  // so `proxy.js` can enforce the forced-change gate on every request at the
  // edge, without a DB round-trip per request.
  const session = await encrypt({ userId, role, mustChangePassword: !!mustChangePassword, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set("cms-session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function updateSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("cms-session")?.value;
  const payload = await decrypt(session);

  if (!session || !payload) return null;

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  cookieStore.set("cms-session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("cms-session");
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("cms-session")?.value;
  return decrypt(session);
}
