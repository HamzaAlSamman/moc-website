// Decides what a scanned ticket means, independent of Prisma and Next so the
// rules can be exercised directly under `node --test`. The caller loads the
// booking row and passes it in; this module never touches the database.

import { verifyBookingTicketCode } from "./booking-ticket-code.mjs";
import { verifyBookingTicketSignature } from "./event-booking-ticket.mjs";

export const TICKET_RESULT = Object.freeze({
  VALID: "VALID",
  NOT_FOUND: "NOT_FOUND",
  CODE_MISMATCH: "CODE_MISMATCH",
  TAMPERED: "TAMPERED",
  CANCELLED: "CANCELLED",
  WAITLISTED: "WAITLISTED",
});

// Only a VALID ticket may be checked in at the door.
const ADMISSIBLE = new Set([TICKET_RESULT.VALID]);

export function isAdmissible(result) {
  return ADMISSIBLE.has(result);
}

/**
 * @param {object|null} booking row with referenceNo, eventId, nationalIdHash,
 *   ticketSig and status — or null when the reference matched nothing.
 * @param {string} suppliedCode code from the QR link or typed by hand
 * @param {string} [secret] BOOKING_TICKET_SECRET, injected in tests
 * @returns {{result: string, admissible: boolean}}
 */
export function verifyScannedTicket(booking, suppliedCode, secret = process.env.BOOKING_TICKET_SECRET) {
  if (!booking) return { result: TICKET_RESULT.NOT_FOUND, admissible: false };

  if (!verifyBookingTicketCode(suppliedCode, booking.ticketSig)) {
    return { result: TICKET_RESULT.CODE_MISMATCH, admissible: false };
  }

  // The code only proves it was derived from the signature stored on this row.
  // Re-deriving the signature from the booking's own identity fields catches
  // the other direction: a row edited directly in the database to point a
  // valid-looking ticket at a different event or person.
  const authentic = verifyBookingTicketSignature(
    {
      signature: booking.ticketSig,
      referenceNo: booking.referenceNo,
      eventId: booking.eventId,
      nationalIdHash: booking.nationalIdHash,
    },
    secret,
  );
  if (!authentic) return { result: TICKET_RESULT.TAMPERED, admissible: false };

  if (booking.status === "CANCELLED") return { result: TICKET_RESULT.CANCELLED, admissible: false };
  if (booking.status === "WAITLISTED") return { result: TICKET_RESULT.WAITLISTED, admissible: false };

  return { result: TICKET_RESULT.VALID, admissible: true };
}

/**
 * Name shown to an anonymous scanner. The QR is printed on the ticket, but the
 * link inside it can be forwarded to anyone, so the public view must not turn
 * a scanned ticket into a way of reading a citizen's full name. Staff holding
 * SCAN_EVENT_TICKETS see the unmasked value.
 */
export function maskTicketHolder(fullName) {
  const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts
    .map((part, index) => (index === 0 ? part : `${part.slice(0, 1)}${"•".repeat(Math.max(part.length - 1, 1))}`))
    .join(" ");
}
