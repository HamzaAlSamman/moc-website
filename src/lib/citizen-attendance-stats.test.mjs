import assert from "node:assert/strict";
import test from "node:test";

import { summarizeCitizenAttendance } from "./citizen-attendance-stats.mjs";

const booking = (status, attendanceStatus) => ({ status, attendanceStatus });

test("counts each booking status and settled attendance separately", () => {
  const stats = summarizeCitizenAttendance([
    booking("CONFIRMED", "ATTENDED"),
    booking("CONFIRMED", "ATTENDED"),
    booking("CONFIRMED", "NO_SHOW"),
    booking("CONFIRMED", "NOT_CHECKED_IN"),
    booking("WAITLISTED", "NOT_CHECKED_IN"),
    booking("CANCELLED", "NOT_CHECKED_IN"),
  ]);

  assert.equal(stats.total, 6);
  assert.equal(stats.confirmed, 4);
  assert.equal(stats.waitlisted, 1);
  assert.equal(stats.cancelled, 1);
  assert.equal(stats.attended, 2);
  assert.equal(stats.noShow, 1);
  assert.equal(stats.pending, 2, "the confirmed and waitlisted future bookings");
  assert.equal(stats.settled, 3);
  assert.equal(stats.attendanceRate, 67);
});

test("a cancelled booking is never counted as a no-show against the citizen", () => {
  const stats = summarizeCitizenAttendance([
    booking("CANCELLED", "NO_SHOW"),
    booking("CONFIRMED", "ATTENDED"),
  ]);
  assert.equal(stats.noShow, 0);
  assert.equal(stats.attendanceRate, 100);
});

test("an upcoming-only history has no rate rather than a zero one", () => {
  const stats = summarizeCitizenAttendance([booking("CONFIRMED", "NOT_CHECKED_IN")]);
  assert.equal(stats.settled, 0);
  assert.equal(stats.attendanceRate, null);
});

test("empty and malformed input produce zeroes, not a crash", () => {
  for (const input of [[], undefined, null, "nope"]) {
    const stats = summarizeCitizenAttendance(input);
    assert.equal(stats.total, 0);
    assert.equal(stats.attended, 0);
    assert.equal(stats.attendanceRate, null);
  }
});
