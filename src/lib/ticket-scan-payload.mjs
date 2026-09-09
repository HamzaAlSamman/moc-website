// The opaque string a ticket QR actually carries.
//
// Until now the QR held the public verification URL, so any phone camera
// opened the ministry's verify page. That page never checked anyone in — the
// door action has always required a staff session holding SCAN_EVENT_TICKETS —
// but the ministry asked for tickets that a generic reader cannot act on *or*
// read at all: only the in-house scanner (/admin/scan) should make sense of a
// ticket.
//
// QR is an open standard, so nothing can stop a reader from decoding the
// bytes. What we can do is make the bytes meaningless: the payload is
// AES-256-GCM ciphertext over (referenceNo, code), printed as
// `MOCT1.<base64url>`. A phone camera shows an unactionable string — not a
// link — and reveals neither the reference number nor the verification code.
// Nobody without BOOKING_TICKET_SECRET can mint one either, because GCM's tag
// is checked before the plaintext is ever returned.
//
// This is defence in depth, not the control itself: the real guarantee is
// still that /api/admin/tickets/* demands an authenticated officer.
//
// The key is derived from BOOKING_TICKET_SECRET rather than a new variable —
// AGENTS.md's rule about not provisioning parallel secrets for the same
// concern. Rotating that secret already invalidates every issued ticket, and
// it invalidates these payloads on exactly the same terms.
//
// Pure and dependency-free apart from node:crypto so it runs under
// `node --test`.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Bump the suffix if the payload layout ever changes; the decoder rejects
// anything it does not recognise rather than guessing.
export const TICKET_SCAN_PREFIX = "MOCT1";

const IV_BYTES = 12; // GCM standard nonce length
const TAG_BYTES = 16;
const SEPARATOR = "\u0000"; // NUL — impossible in a reference or a base32 code
// Bounded so a malicious QR cannot hand us an unreasonable buffer to decrypt.
const MAX_PAYLOAD_CHARS = 512;

function requireSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("BOOKING_TICKET_SECRET must contain at least 32 characters");
  }
  return secret;
}

// A distinct key for encryption, so the same secret that signs tickets is
// never used directly as a cipher key.
function scanKey(secret) {
  return Buffer.from(
    hkdfSync("sha256", requireSecret(secret), "moc-ticket-scan-v1", "aes-256-gcm", 32),
  );
}

/**
 * @param {{referenceNo: string, code: string}} input
 * @param {string} [secret]
 * @returns {string} e.g. "MOCT1.qA7f…"
 */
export function encodeTicketScanPayload({ referenceNo, code }, secret = process.env.BOOKING_TICKET_SECRET) {
  if (typeof referenceNo !== "string" || !referenceNo || referenceNo.includes(SEPARATOR)) {
    throw new Error("A booking reference is required to build a ticket scan payload");
  }
  if (typeof code !== "string" || !code) {
    throw new Error("A ticket verification code is required to build a ticket scan payload");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", scanKey(secret), iv);
  const body = Buffer.concat([
    cipher.update(`${referenceNo}${SEPARATOR}${code}`, "utf8"),
    cipher.final(),
  ]);
  const packed = Buffer.concat([iv, body, cipher.getAuthTag()]);
  return `${TICKET_SCAN_PREFIX}.${packed.toString("base64url")}`;
}

/**
 * Never throws on bad input: a scanner points at whatever happens to be in
 * front of it, so "this is not one of ours" is an ordinary outcome, not an
 * error condition.
 *
 * @param {unknown} raw text decoded from the QR
 * @param {string} [secret]
 * @returns {{referenceNo: string, code: string}|null}
 */
export function decodeTicketScanPayload(raw, secret = process.env.BOOKING_TICKET_SECRET) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length > MAX_PAYLOAD_CHARS) return null;
  if (!trimmed.startsWith(`${TICKET_SCAN_PREFIX}.`)) return null;

  const encoded = trimmed.slice(TICKET_SCAN_PREFIX.length + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  const packed = Buffer.from(encoded, "base64url");
  if (packed.length <= IV_BYTES + TAG_BYTES) return null;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      scanKey(secret),
      packed.subarray(0, IV_BYTES),
    );
    decipher.setAuthTag(packed.subarray(packed.length - TAG_BYTES));
    const plain = Buffer.concat([
      decipher.update(packed.subarray(IV_BYTES, packed.length - TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");
    const [referenceNo, code, ...rest] = plain.split(SEPARATOR);
    if (!referenceNo || !code || rest.length) return null;
    return { referenceNo, code };
  } catch {
    // Wrong secret, truncated QR, or a tampered payload — all indistinguishable
    // to the officer at the door, and all mean the same thing: not our ticket.
    return null;
  }
}

/** True when the text looks like one of ours, before any secret is involved. */
export function looksLikeTicketScanPayload(raw) {
  return typeof raw === "string" && raw.trim().startsWith(`${TICKET_SCAN_PREFIX}.`);
}
