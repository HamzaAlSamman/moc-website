import assert from "node:assert/strict";
import test from "node:test";

import {
  TICKET_CODE_LENGTH,
  bookingTicketCode,
  bookingTicketPortalUrl,
  citizenTicketPageUrl,
  formatBookingTicketCode,
  verifyBookingTicketCode,
} from "./booking-ticket-code.mjs";
import { createBookingTicketSignature } from "./event-booking-ticket.mjs";

const SECRET = "a".repeat(32);
const BOOKING = { referenceNo: "BKG-2026-0001", eventId: "event-1", nationalIdHash: "nid-hash-1" };
const SIG = createBookingTicketSignature(BOOKING, SECRET);

test("the code is stable, uppercase base32 of the fixed length", () => {
  const code = bookingTicketCode(SIG);
  assert.equal(code.length, TICKET_CODE_LENGTH);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  assert.equal(bookingTicketCode(SIG), code, "same signature must always yield the same code");
});

test("a different booking yields a different code", () => {
  const other = createBookingTicketSignature({ ...BOOKING, eventId: "event-2" }, SECRET);
  assert.notEqual(bookingTicketCode(other), bookingTicketCode(SIG));
});

test("verification accepts what people actually type", () => {
  const code = bookingTicketCode(SIG);
  assert.equal(verifyBookingTicketCode(code, SIG), true);
  assert.equal(verifyBookingTicketCode(code.toLowerCase(), SIG), true);
  assert.equal(verifyBookingTicketCode(formatBookingTicketCode(code), SIG), true);
  assert.equal(verifyBookingTicketCode(` ${code} `, SIG), true);
});

test("verification rejects wrong, truncated and malformed input", () => {
  const code = bookingTicketCode(SIG);
  assert.equal(verifyBookingTicketCode(code.slice(0, 9), SIG), false);
  assert.equal(verifyBookingTicketCode(`${code}X`, SIG), false);
  assert.equal(verifyBookingTicketCode("", SIG), false);
  assert.equal(verifyBookingTicketCode(null, SIG), false);
  assert.equal(verifyBookingTicketCode(code, "not-a-signature"), false);
  const other = createBookingTicketSignature({ ...BOOKING, referenceNo: "BKG-2026-0002" }, SECRET);
  assert.equal(verifyBookingTicketCode(bookingTicketCode(other), SIG), false);
});

test("deriving a code requires a real signature", () => {
  assert.throws(() => bookingTicketCode("short"), /signature is required/);
  assert.throws(() => bookingTicketCode(undefined), /signature is required/);
});

test("the printed link is built from configuration, never from a request host", () => {
  assert.equal(
    bookingTicketPortalUrl("ar", { APP_BASE_URL: "https://moc.gov.sy" }),
    "https://moc.gov.sy/ar/tickets/verify",
  );

  // Falls back the same way password-reset links do, and refuses to guess.
  assert.equal(
    bookingTicketPortalUrl("en", { NEXT_PUBLIC_APP_URL: "https://moc.gov.sy" }),
    "https://moc.gov.sy/en/tickets/verify",
  );
  assert.throws(() => bookingTicketPortalUrl("ar", {}), /APP_BASE_URL is required/);
});

test("the emailed ticket link points at the citizen's own account page", () => {
  assert.equal(
    citizenTicketPageUrl({ referenceNo: "BKG-2026-0001" }, { APP_BASE_URL: "https://moc.gov.sy" }),
    "https://moc.gov.sy/ar/account/bookings/BKG-2026-0001/ticket",
  );
  // Behind the citizen session, so forwarding the email never forwards access.
  assert.doesNotMatch(
    citizenTicketPageUrl({ referenceNo: "BKG-2026-0001" }, { APP_BASE_URL: "https://moc.gov.sy" }),
    /code=|ticketSig/,
  );
  assert.throws(() => citizenTicketPageUrl({ referenceNo: "" }, { APP_BASE_URL: "https://moc.gov.sy" }), /reference is required/);
  assert.throws(() => citizenTicketPageUrl({ referenceNo: "BKG-1" }, {}), /APP_BASE_URL is required/);
});

test("the printed link never carries the reference or the code", () => {
  // The whole point of the opaque QR: nothing in the system hands out a
  // prefilled verification link any more.
  const url = bookingTicketPortalUrl("ar", { APP_BASE_URL: "https://moc.gov.sy" });
  assert.ok(!url.includes("?"), url);
  assert.ok(!url.includes(bookingTicketCode(SIG)), url);
  assert.ok(!url.includes(BOOKING.referenceNo), url);
});
