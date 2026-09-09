import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBookingGroups, summarizeEventBookings } from "./event-booking-stats.mjs";

const group = (status, attendanceStatus, source, count) => ({ status, attendanceStatus, source, count });

// A plausible mid-sized event: 40 confirmed seats (30 booked online, 10 walk-in
// entries made by staff), 5 on the waitlist, 8 cancellations, and the door has
// been run — 26 showed up, 14 did not.
const EVENT_GROUPS = [
  group("CONFIRMED", "ATTENDED", "CITIZEN", 20),
  group("CONFIRMED", "ATTENDED", "ADMIN", 6),
  group("CONFIRMED", "NO_SHOW", "CITIZEN", 10),
  group("CONFIRMED", "NO_SHOW", "ADMIN", 4),
  group("WAITLISTED", "NOT_CHECKED_IN", "CITIZEN", 5),
  group("CANCELLED", "NOT_CHECKED_IN", "CITIZEN", 8),
];

test("counts split cleanly across status, attendance and source", () => {
  const stats = summarizeEventBookings(EVENT_GROUPS, { capacity: 50, waitlistEnabled: true });
  assert.equal(stats.total, 53);
  assert.equal(stats.confirmed, 40);
  assert.equal(stats.waitlisted, 5);
  assert.equal(stats.cancelled, 8);
  assert.equal(stats.attended, 26);
  assert.equal(stats.noShow, 14);
  assert.equal(stats.bySource.citizen, 43);
  assert.equal(stats.bySource.admin, 10);
  assert.equal(stats.bySource.citizen + stats.bySource.admin, stats.total);
});

test("a cancelled booking is never counted as a no-show", () => {
  // Cancelled rows carry NOT_CHECKED_IN forever; counting them as absences
  // would punish citizens who released their seat in time.
  const stats = summarizeEventBookings(EVENT_GROUPS, { capacity: 50 });
  assert.equal(stats.notCheckedIn, 5, "only the waitlisted rows are still pending");
  assert.equal(stats.attended + stats.noShow + stats.notCheckedIn, stats.total - stats.cancelled);
});

test("seat figures come from confirmed bookings, not from the total", () => {
  const stats = summarizeEventBookings(EVENT_GROUPS, { capacity: 50 });
  assert.equal(stats.capacity, 50);
  assert.equal(stats.seatsLeft, 10);
  assert.equal(stats.fillRate, 80);
});

test("rates answer the two different questions they are named for", () => {
  const stats = summarizeEventBookings(EVENT_GROUPS, { capacity: 50 });
  assert.equal(stats.attendanceRate, 65, "26 of the 40 settled bookings attended");
  assert.equal(stats.turnoutRate, 65, "26 of the 40 seats given out were used");
  assert.equal(stats.cancellationRate, 15, "8 of 53 bookings were cancelled");
});

test("an event that has not happened yet reports null rates, not zero", () => {
  // Everything still NOT_CHECKED_IN: reporting 0% attendance would read as a
  // catastrophe rather than "the door has not opened".
  const stats = summarizeEventBookings(
    [group("CONFIRMED", "NOT_CHECKED_IN", "CITIZEN", 30)],
    { capacity: 100 },
  );
  assert.equal(stats.confirmed, 30);
  assert.equal(stats.attendanceRate, null);
  assert.equal(stats.turnoutRate, null);
  assert.equal(stats.notCheckedIn, 30);
  assert.equal(stats.fillRate, 30);
});

test("an event with no bookings at all is reported without dividing by zero", () => {
  const stats = summarizeEventBookings([], { capacity: 100 });
  assert.equal(stats.total, 0);
  assert.equal(stats.attendanceRate, null);
  assert.equal(stats.turnoutRate, null);
  assert.equal(stats.cancellationRate, null);
  assert.equal(stats.fillRate, 0);
  assert.equal(stats.seatsLeft, 100);
});

test("an event with no capacity set reports null instead of a fake denominator", () => {
  const stats = summarizeEventBookings(EVENT_GROUPS, { capacity: null });
  assert.equal(stats.capacity, null);
  assert.equal(stats.seatsLeft, null);
  assert.equal(stats.fillRate, null);
  // Counts still work — capacity is only needed for the seat ratios.
  assert.equal(stats.confirmed, 40);
});

test("overbooking is reported, not clamped out of sight", () => {
  const stats = summarizeEventBookings([group("CONFIRMED", "NOT_CHECKED_IN", "CITIZEN", 12)], { capacity: 10 });
  assert.equal(stats.fillRate, 120, "a counter drifting past capacity must stay visible");
  assert.equal(stats.seatsLeft, 0);
});

test("malformed rows degrade to zero rather than NaN", () => {
  const stats = summarizeEventBookings(
    [{ status: "CONFIRMED", attendanceStatus: "ATTENDED", source: "CITIZEN", count: "abc" }, null],
    { capacity: 10 },
  );
  assert.equal(stats.total, 0);
  assert.equal(stats.fillRate, 0);
  assert.equal(summarizeEventBookings(null).total, 0);
});

test("prisma groupBy output is reshaped into plain counts", () => {
  const normalized = normalizeBookingGroups([
    { status: "CONFIRMED", attendanceStatus: "ATTENDED", source: "CITIZEN", _count: { _all: 7 } },
  ]);
  assert.deepEqual(normalized, [
    { status: "CONFIRMED", attendanceStatus: "ATTENDED", source: "CITIZEN", count: 7 },
  ]);
  assert.deepEqual(normalizeBookingGroups(), []);
});
