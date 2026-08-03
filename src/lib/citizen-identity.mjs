import { createHmac, timingSafeEqual } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// National-ID handling for citizen accounts.
//
// The national ID is the one thing that makes "one account per person"
// meaningful — see the Citizen model comment in schema.prisma and plan
// section 7.2.1. It is NEVER stored or logged in the clear: this module
// only ever hands callers a keyed HMAC hash (for uniqueness/lookup) and the
// last 4 digits (for door-side visual verification against a printed
// ticket). The raw value should be discarded by the caller as soon as
// hashNationalId()/lastFour() have been called on it.
// ─────────────────────────────────────────────────────────────────────────────

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"; // U+0660–U+0669
const EXTENDED_ARABIC_INDIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹"; // U+06F0–U+06F9 (Persian/Urdu)

// Syrian national ID: 11 digits. Matches the pattern already enforced for
// legal-license applications (src/lib/legal-license.mjs's
// isValidLegalLicenseNationalId) — kept identical rather than reinvented,
// but applied here only *after* digit normalization below, which the
// legal-license validator does not do.
const NATIONAL_ID_PATTERN = /^\d{11}$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Converts Arabic-Indic and Extended Arabic-Indic digits to Latin, and
 * strips whitespace and dashes. Does NOT validate — call isValidNationalId
 * on the result. Non-string input normalizes to "".
 *
 * "١٢٣٤٥٦٧٨٩٠١" and "123-456-789 01" both normalize to "12345678901".
 */
export function normalizeNationalId(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EXTENDED_ARABIC_INDIC_DIGITS.indexOf(d)))
    .replace(/[\s-]/g, "");
}

export function isValidNationalId(normalized) {
  return typeof normalized === "string" && NATIONAL_ID_PATTERN.test(normalized);
}

/** Trim + lowercase. Citizen.email and the case-insensitive unique index both assume this. */
export function normalizeEmail(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

export function isValidEmail(normalizedEmail) {
  return typeof normalizedEmail === "string" && EMAIL_PATTERN.test(normalizedEmail);
}

/**
 * Fails loudly if CITIZEN_ID_PEPPER is missing or too weak to be a real
 * secret. Mirrors src/lib/crypto.js's SESSION_SECRET check exactly (same
 * 32-character floor, same unconditional — not just production-only —
 * enforcement) so this module has one predictable failure mode instead of
 * a second, subtly different one to remember.
 *
 * Called once at import time below, and exported so callers (or tests) can
 * re-assert explicitly.
 *
 * ⚠️ Changing CITIZEN_ID_PEPPER after any citizen has registered breaks
 * uniqueness: every existing nationalIdHash becomes unrecoverable (a
 * different pepper produces a different hash for the same ID), silently
 * allowing duplicate accounts per national ID going forward. Treat it as a
 * permanent secret, provisioned once, never rotated casually.
 */
export function assertIdentityPepper() {
  const pepper = process.env.CITIZEN_ID_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error(
      "CITIZEN_ID_PEPPER is missing or too short (need at least 32 characters). " +
        "Set a strong random CITIZEN_ID_PEPPER in the environment before starting the app."
    );
  }
  return pepper;
}

const pepper = assertIdentityPepper();

/**
 * HMAC-SHA256(CITIZEN_ID_PEPPER, normalizedNationalId), hex-encoded.
 * Callers must normalize first — this function does not normalize or
 * validate, so two differently-formatted-but-equal IDs will only hash to
 * the same value if normalizeNationalId() was applied to both first.
 */
export function hashNationalId(normalizedNationalId) {
  return createHmac("sha256", pepper).update(normalizedNationalId, "utf8").digest("hex");
}

export function nationalIdHashMatches(normalizedNationalId, expectedHash) {
  try {
    const actual = Buffer.from(hashNationalId(normalizedNationalId), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Last 4 digits, for door-side visual verification. Assumes a validated, normalized ID. */
export function lastFour(normalizedNationalId) {
  return normalizedNationalId.slice(-4);
}
