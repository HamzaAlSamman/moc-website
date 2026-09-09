// Short, human-readable verification code for an event ticket.
//
// Every booking already stores `ticketSig` — HMAC-SHA-256 over
// (referenceNo, eventId, nationalIdHash) keyed with BOOKING_TICKET_SECRET,
// written inside the booking transaction (see event-booking-service.js). This
// module turns that signature into the 10-character code printed on the
// ticket and embedded in its QR link.
//
// Why a prefix of the existing signature rather than a second HMAC: the code
// has to be derivable by anyone holding the secret and by nobody else, which
// the stored signature already guarantees. Publishing 50 bits of a 256-bit
// HMAC does not help an attacker forge a *different* ticket — each booking's
// signature is over its own inputs — while a second, independently keyed
// digest would just add a second secret to rotate.
//
// Pure and dependency-free apart from node:crypto so it runs under node --test.

import { timingSafeEqual } from "node:crypto";
import { toBase32 } from "./pdf-verification.mjs";

export const TICKET_CODE_LENGTH = 10;

const HEX_SIGNATURE = /^[a-f0-9]{64}$/i;

/**
 * @param {string} ticketSig hex HMAC stored on the booking row
 * @returns {string} 10-character uppercase base32 code, e.g. "K7RVTQ4N2M"
 */
export function bookingTicketCode(ticketSig) {
  if (typeof ticketSig !== "string" || !HEX_SIGNATURE.test(ticketSig)) {
    throw new Error("A booking ticket signature is required to derive its code");
  }
  return toBase32(Buffer.from(ticketSig, "hex"), TICKET_CODE_LENGTH);
}

/**
 * Constant-time check of a code supplied by a scanner or typed by hand.
 *
 * @param {string} supplied
 * @param {string} ticketSig
 * @returns {boolean}
 */
export function verifyBookingTicketCode(supplied, ticketSig) {
  if (typeof supplied !== "string" || typeof ticketSig !== "string") return false;
  if (!HEX_SIGNATURE.test(ticketSig)) return false;
  // Normalize the shapes people actually produce: lowercase from a keyboard,
  // and the dash groups printed on the ticket for legibility.
  const normalized = supplied.toUpperCase().replace(/[\s-]/g, "");
  if (normalized.length !== TICKET_CODE_LENGTH) return false;
  const expected = Buffer.from(bookingTicketCode(ticketSig), "utf8");
  const actual = Buffer.from(normalized, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Groups the code for printing: "K7RVT-Q4N2M". */
export function formatBookingTicketCode(code) {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/**
 * The verification page printed on a ticket — deliberately *without* the
 * reference and code in the query string.
 *
 * The QR used to carry exactly that parameterised link, which meant any phone
 * camera opened a working verification page. The QR now carries an opaque
 * encrypted payload instead (see ticket-scan-payload.mjs), so nothing in the
 * system mints prefilled verification links any more: whoever is holding the
 * ticket types the reference and code, and only ministry door staff can turn
 * either into an actual check-in.
 *
 * Built only from server configuration — never a request header — for the
 * same reason password reset links are (see citizen-auth-core.mjs).
 *
 * @param {string} [locale]
 * @param {NodeJS.ProcessEnv} [env]
 */
export function bookingTicketPortalUrl(locale = "ar", env = process.env) {
  const raw = env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error("APP_BASE_URL is required to build ticket verification links");
  return new URL(`/${locale}/tickets/verify`, new URL(raw).origin).toString();
}

/**
 * Where the citizen's own ticket lives in their account. Put in confirmation
 * email alongside the attached PDF: the page is behind the citizen session, so
 * the link is safe to mail even though the attachment is not — forwarding the
 * message hands over the PDF, but never the account.
 *
 * @param {{referenceNo: string, locale?: string}} input
 * @param {NodeJS.ProcessEnv} [env]
 */
export function citizenTicketPageUrl({ referenceNo, locale = "ar" }, env = process.env) {
  if (typeof referenceNo !== "string" || !referenceNo) {
    throw new Error("A booking reference is required to build a ticket page link");
  }
  const raw = env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error("APP_BASE_URL is required to build ticket page links");
  return new URL(
    `/${locale}/account/bookings/${encodeURIComponent(referenceNo)}/ticket`,
    new URL(raw).origin,
  ).toString();
}
