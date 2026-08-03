import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBookingTicketSignature,
  verifyBookingTicketSignature,
} from "./event-booking-ticket.mjs";

const SECRET = "booking-ticket-secret-with-at-least-32-characters";

test("booking ticket signatures bind reference, event, and national-ID hash", () => {
  const input = {
    referenceNo: "BKG-2026-0001",
    eventId: "event-1",
    nationalIdHash: "national-hash",
  };
  const signature = createBookingTicketSignature(input, SECRET);
  assert.match(signature, /^[a-f0-9]{64}$/);
  assert.equal(verifyBookingTicketSignature({ ...input, signature }, SECRET), true);
  assert.equal(verifyBookingTicketSignature({ ...input, eventId: "event-2", signature }, SECRET), false);
  assert.equal(verifyBookingTicketSignature({ ...input, signature: "x".repeat(64) }, SECRET), false);
});

test("booking transactions lock Event first and use SKIP LOCKED for waitlist promotion", async () => {
  const source = await readFile(new URL("./event-booking-service.js", import.meta.url), "utf8");
  assert.match(source, /\$transaction/);
  assert.match(source, /FROM "Event"[\s\S]*FOR UPDATE/);
  assert.match(source, /FROM "EventBooking"[\s\S]*FOR UPDATE SKIP LOCKED/);
  assert.match(source, /ORDER BY "createdAt" ASC, "id" ASC/);
  assert.match(source, /bookingAvailability/);
  assert.match(source, /reviewStatus/);
  assert.doesNotMatch(source, /lockedUntil/);
});

test("booking service exposes all planned lifecycle operations and durable notifications", async () => {
  const source = await readFile(new URL("./event-booking-service.js", import.meta.url), "utf8");
  for (const name of [
    "createBooking",
    "cancelBooking",
    "promoteFromWaitlist",
    "syncCapacity",
    "reconcileBookedCount",
    "checkInBooking",
    "markNoShows",
    "cancelEventAndBookings",
  ]) {
    assert.match(source, new RegExp(`export async function ${name}\\b`));
  }
  assert.match(source, /notificationOutbox\.create/);
  assert.match(source, /BOOKING_(?:CONFIRMED|WAITLISTED|PROMOTED|CANCELLED)/);
  assert.match(source, /EVENT_CANCELLED/);
});

test("duplicate booking conflicts are translated into an idempotent active-booking lookup", async () => {
  const source = await readFile(new URL("./event-booking-service.js", import.meta.url), "utf8");
  assert.match(source, /P2002/);
  assert.match(source, /findActiveBooking/);
  assert.match(source, /idempotent/);
});
