/**
 * PDF Verification — HMAC-based anti-forgery codes for legal license PDFs.
 *
 * How it works:
 *   1. When a PDF is generated, a short verification code is computed from the
 *      application's immutable identifiers using HMAC-SHA-256 + base32.
 *   2. The code is embedded in the PDF as a QR code + human-readable string.
 *   3. Anyone who receives the PDF can scan the QR or enter the code on the
 *      ministry verification page to confirm authenticity.
 *
 * Environment variable required:
 *   PDF_VERIFICATION_SECRET — a long random string (min 32 chars).
 *   Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createHmac } from "node:crypto";

const BASE32_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Crockford base32 (no I/O/1/0)

// Exported because event ticket codes use the same alphabet: the characters
// are chosen so a code read off a printed page is unambiguous, and that
// property is worth having identically on every document the ministry issues.
export function toBase32(buf, length) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && output.length < length) {
      bits -= 5;
      output += BASE32_CHARS[(value >> bits) & 0x1f];
    }
  }
  return output.padEnd(length, BASE32_CHARS[0]).slice(0, length);
}

/**
 * Computes a short verification code for a legal license PDF.
 *
 * @param {string} referenceNo  - Application reference number
 * @param {string} id           - Application database ID
 * @param {number|string} revision - Document revision number
 * @returns {string} 8-character uppercase base32 code, e.g. "K7RVTQ4N"
 */
export function computeVerificationCode(referenceNo, id, revision) {
  const secret = process.env.PDF_VERIFICATION_SECRET || "moc-pdf-default-secret-change-in-production";
  const message = `${referenceNo}|${id}|${revision}`;
  const hmac = createHmac("sha256", secret).update(message, "utf8").digest();
  return toBase32(hmac, 8);
}

/**
 * Verifies a code submitted by a user against the expected code for an application.
 *
 * @param {string} code        - Code submitted by the user (case-insensitive)
 * @param {string} referenceNo
 * @param {string} id
 * @param {number|string} revision
 * @returns {boolean}
 */
export function verifyDocumentCode(code, referenceNo, id, revision) {
  if (!code || typeof code !== "string") return false;
  const expected = computeVerificationCode(referenceNo, id, revision);
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(code.toUpperCase().padEnd(8, " ").slice(0, 8));
  const b = Buffer.from(expected);
  let diff = 0;
  for (let i = 0; i < 8; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
