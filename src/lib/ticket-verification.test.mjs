import assert from "node:assert/strict";
import test from "node:test";

import { bookingTicketCode } from "./booking-ticket-code.mjs";
import { createBookingTicketSignature } from "./event-booking-ticket.mjs";
import {
  TICKET_RESULT,
  isAdmissible,
  maskTicketHolder,
  verifyScannedTicket,
} from "./ticket-verification.mjs";

const SECRET = "b".repeat(32);
const IDENTITY = { referenceNo: "BKG-2026-0007", eventId: "event-7", nationalIdHash: "nid-hash-7" };

function booking(overrides = {}) {
  const row = { ...IDENTITY, status: "CONFIRMED", ...overrides };
  return { ...row, ticketSig: overrides.ticketSig ?? createBookingTicketSignature(IDENTITY, SECRET) };
}

function scan(row, code = bookingTicketCode(booking().ticketSig)) {
  return verifyScannedTicket(row, code, SECRET);
}

test("a confirmed ticket with the right code is admissible", () => {
  const outcome = scan(booking());
  assert.equal(outcome.result, TICKET_RESULT.VALID);
  assert.equal(outcome.admissible, true);
  assert.equal(isAdmissible(outcome.result), true);
});

test("an unknown reference is reported without touching anything else", () => {
  assert.deepEqual(scan(null), { result: TICKET_RESULT.NOT_FOUND, admissible: false });
});

test("a wrong code never admits, even for a real booking", () => {
  const outcome = verifyScannedTicket(booking(), "AAAAAAAAAA", SECRET);
  assert.equal(outcome.result, TICKET_RESULT.CODE_MISMATCH);
  assert.equal(outcome.admissible, false);
});

test("a row whose signature no longer matches its own identity is flagged as tampered", () => {
  // The code still matches the stored signature, but that signature belongs to
  // a different event — i.e. the row was edited underneath a genuine ticket.
  const foreign = createBookingTicketSignature({ ...IDENTITY, eventId: "event-99" }, SECRET);
  const outcome = verifyScannedTicket(booking({ ticketSig: foreign }), bookingTicketCode(foreign), SECRET);
  assert.equal(outcome.result, TICKET_RESULT.TAMPERED);
  assert.equal(outcome.admissible, false);
});

test("cancelled and waitlisted tickets are authentic but not admissible", () => {
  assert.deepEqual(scan(booking({ status: "CANCELLED" })), { result: TICKET_RESULT.CANCELLED, admissible: false });
  assert.deepEqual(scan(booking({ status: "WAITLISTED" })), { result: TICKET_RESULT.WAITLISTED, admissible: false });
});

test("the public view masks everything after the first name", () => {
  assert.equal(maskTicketHolder("حمزة السمان"), "حمزة ا•••••");
  assert.equal(maskTicketHolder("  Ali  Ahmad Nasser "), "Ali A•••• N•••••");
  assert.equal(maskTicketHolder(""), "—");
  assert.equal(maskTicketHolder(null), "—");
});
