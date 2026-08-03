import assert from "node:assert/strict";
import test from "node:test";

import {
  bookingOutcome,
  bookingWindowState,
  canEnableInternalBooking,
  citizenMayBook,
  remainingSpots,
} from "./event-booking-rules.mjs";

const NOW = new Date("2026-08-03T12:00:00.000Z");

test("bookingWindowState distinguishes disabled, closed, not-open, open, and ended", () => {
  assert.equal(bookingWindowState({ bookingAvailability: "DISABLED" }, NOW), "DISABLED");
  assert.equal(bookingWindowState({ bookingAvailability: "CLOSED" }, NOW), "CLOSED");
  assert.equal(bookingWindowState({
    bookingAvailability: "OPEN",
    bookingOpensAt: new Date("2026-08-03T12:00:00.001Z"),
  }, NOW), "NOT_OPEN_YET");
  assert.equal(bookingWindowState({
    bookingAvailability: "OPEN",
    bookingOpensAt: new Date("2026-08-03T11:00:00.000Z"),
    bookingClosesAt: new Date("2026-08-03T12:00:00.000Z"),
  }, NOW), "CLOSED");
  assert.equal(bookingWindowState({
    bookingAvailability: "OPEN",
    bookingOpensAt: new Date("2026-08-03T12:00:00.000Z"),
    bookingClosesAt: new Date("2026-08-03T13:00:00.000Z"),
  }, NOW), "OPEN");
});

test("remainingSpots never returns a negative or non-finite value", () => {
  assert.equal(remainingSpots({ capacity: 10, bookedCount: 3 }), 7);
  assert.equal(remainingSpots({ capacity: 10, bookedCount: 12 }), 0);
  assert.equal(remainingSpots({ capacity: null, bookedCount: 0 }), 0);
});

test("bookingOutcome confirms when a seat remains, otherwise waits or reports full", () => {
  assert.equal(bookingOutcome({ capacity: 10, bookedCount: 9, waitlistEnabled: true }), "CONFIRMED");
  assert.equal(bookingOutcome({ capacity: 10, bookedCount: 10, waitlistEnabled: true }), "WAITLISTED");
  assert.equal(bookingOutcome({ capacity: 10, bookedCount: 10, waitlistEnabled: false }), "FULL");
});

test("internal booking validates source, external URL, capacity, count, and time ordering", () => {
  const valid = {
    source: "MOC",
    bookingUrl: null,
    capacity: 20,
    bookedCount: 2,
    bookingOpensAt: new Date("2026-08-03T10:00:00.000Z"),
    bookingClosesAt: new Date("2026-08-04T10:00:00.000Z"),
    startDate: new Date("2026-08-04T12:00:00.000Z"),
  };
  assert.deepEqual(canEnableInternalBooking(valid), { ok: true });
  assert.deepEqual(canEnableInternalBooking({ ...valid, bookingClosesAt: valid.startDate }), { ok: true });
  for (const [change, code] of [
    [{ source: "OPERA" }, "EXTERNAL_SOURCE"],
    [{ bookingUrl: "https://tickets.example" }, "EXTERNAL_BOOKING_URL"],
    [{ capacity: 0 }, "INVALID_CAPACITY"],
    [{ capacity: 1, bookedCount: 2 }, "CAPACITY_BELOW_BOOKED"],
    [{ bookingOpensAt: valid.bookingClosesAt }, "INVALID_BOOKING_WINDOW"],
    [{ bookingClosesAt: new Date("2026-08-04T12:00:00.001Z") }, "INVALID_BOOKING_WINDOW"],
  ]) {
    assert.deepEqual(canEnableInternalBooking({ ...valid, ...change }), { ok: false, code });
  }
});

test("citizenMayBook requires verified email/identity and an active unblocked account only", () => {
  const citizen = {
    emailVerifiedAt: NOW,
    identityStatus: "VERIFIED",
    isActive: true,
    isBlocked: false,
    lockedUntil: new Date("2099-01-01T00:00:00.000Z"),
  };
  assert.equal(citizenMayBook(citizen), true, "lockedUntil must not affect an existing valid session");
  for (const change of [
    { emailVerifiedAt: null },
    { identityStatus: "PENDING" },
    { isActive: false },
    { isBlocked: true },
  ]) {
    assert.equal(citizenMayBook({ ...citizen, ...change }), false);
  }
});
