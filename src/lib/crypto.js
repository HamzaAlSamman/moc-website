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

export async function encrypt(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}
