import { createHmac, timingSafeEqual } from "node:crypto";

function requireSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("BOOKING_TICKET_SECRET must contain at least 32 characters");
  }
  return secret;
}

function ticketMessage({ referenceNo, eventId, nationalIdHash }) {
  if (!referenceNo || !eventId || !nationalIdHash) throw new Error("Invalid booking ticket input");
  return `${referenceNo}\0${eventId}\0${nationalIdHash}`;
}

export function createBookingTicketSignature(input, secret = process.env.BOOKING_TICKET_SECRET) {
  return createHmac("sha256", requireSecret(secret)).update(ticketMessage(input)).digest("hex");
}

export function verifyBookingTicketSignature(
  { signature, ...input },
  secret = process.env.BOOKING_TICKET_SECRET,
) {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(createBookingTicketSignature(input, secret), "hex");
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
