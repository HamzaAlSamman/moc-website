import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.SESSION_SECRET;

// Fail fast at startup rather than silently signing every session JWT with an
// empty/weak key. Without this, a missing SESSION_SECRET would encode tokens
// with the string "undefined" — trivially forgeable by anyone, defeating auth
// entirely. A short secret is brute-forceable, so require a real one.
if (!secretKey || secretKey.length < 32) {
  throw new Error(
    "SESSION_SECRET is missing or too short (need at least 32 characters). " +
      "Set a strong random SESSION_SECRET in the environment before starting the app."
  );
}

const encodedKey = new TextEncoder().encode(secretKey);

// Every signed token in this app carries an `aud` (audience) claim naming
// which of the app's three token families it belongs to. Without this, a
// citizen session and a CMS admin session are structurally identical JWTs
// signed with the same SESSION_SECRET — accepting one where the other is
// expected is a straight privilege escalation (a citizen cookie would open
// /admin). `decryptFor` enforces the audience match; a token minted for one
// audience is unconditionally rejected when checked against another,
// including tokens that carry no `aud` claim at all.
export const TOKEN_AUDIENCE = Object.freeze({
  CMS: "moc:cms", // staff/admin session (cms-session cookie)
  CITIZEN: "moc:citizen", // citizen account session (citizen-session cookie)
  GATE: "moc:gate", // temporary services-gate password cookie
});

export async function encryptFor(audience, payload, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(expiresIn)
    .sign(encodedKey);
}

export async function decryptFor(audience, token = "") {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
      audience,
    });
    return payload;
  } catch {
    return null;
  }
}

// Back-compat wrappers bound to the CMS audience, kept for the existing
// staff-session call sites (src/lib/session.js). New code — citizen
// sessions, the services gate — must call encryptFor/decryptFor with an
// explicit audience instead of using these.
export async function encrypt(payload) {
  return encryptFor(TOKEN_AUDIENCE.CMS, payload);
}

export async function decrypt(session = "") {
  return decryptFor(TOKEN_AUDIENCE.CMS, session);
}
