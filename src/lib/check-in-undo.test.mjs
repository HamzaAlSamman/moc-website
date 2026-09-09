import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// Source-shape checks in the style of admin-booking-routes.test.mjs. Undoing a
// check-in is the one action in the door flow that erases a record rather than
// writing one, so what these defend is who may do it and that it leaves a
// trace.

const repo = (...parts) => path.join(process.cwd(), ...parts);

test("undo returns to NOT_CHECKED_IN and is idempotent", async () => {
  const service = await readFile(repo("src", "lib", "event-booking-service.js"), "utf8");
  assert.match(service, /export async function undoCheckIn/);
  // NOT_CHECKED_IN, not NO_SHOW: the honest state after an erroneous record is
  // erased is "no record". markNoShows turns it into an absence later.
  assert.match(service, /attendanceStatus: "NOT_CHECKED_IN", checkedInAt: null, checkedInById: null/);
  assert.match(service, /if \(booking\.attendanceStatus !== "ATTENDED"\) return \{ \.\.\.booking, idempotent: true \}/);
  // Locked like every other attendance write, so two officers correcting the
  // same row cannot interleave.
  assert.match(service, /undoCheckIn[\s\S]{0,600}lockBooking/);
});

test("a door account may only reverse the check-in it made itself", async () => {
  const service = await readFile(repo("src", "lib", "event-booking-service.js"), "utf8");
  const route = await readFile(repo("src", "app", "api", "admin", "tickets", "check-in", "route.js"), "utf8");
  // Enforced against the stored checkedInById inside the transaction, not in
  // the route, so no race slips between the check and the write.
  assert.match(service, /restrictToActor && booking\.checkedInById !== actorId/);
  assert.match(service, /CHECK_IN_NOT_YOURS/);
  assert.match(route, /restrictToActor: !can\(actor\.role, "MANAGE_EVENT_BOOKINGS"\)/);
  // The officer must still be holding the ticket — same proof as checking in.
  assert.match(route, /export async function DELETE[\s\S]*verifyScannedTicket/);
  assert.match(route, /export async function DELETE[\s\S]*SCAN_EVENT_TICKETS/);
});

test("both undo paths are origin-checked and audited", async () => {
  for (const file of [
    repo("src", "app", "api", "admin", "tickets", "check-in", "route.js"),
    repo("src", "app", "api", "admin", "bookings", "[id]", "check-in", "route.js"),
  ]) {
    const source = await readFile(file, "utf8");
    const del = source.slice(source.indexOf("export async function DELETE"));
    assert.match(del, /verifyTrustedOrigin/, file);
    assert.match(del, /EVENT_BOOKING_CHECK_IN_REVERTED/, file);
    // Nothing to undo writes no audit row — otherwise a double tap would
    // manufacture a second entry for an action that never happened.
    assert.match(del, /if \(!updated\.idempotent\)/, file);
  }
});

test("the desk undo carries the same authority as the desk check-in", async () => {
  const route = await readFile(repo("src", "app", "api", "admin", "bookings", "[id]", "check-in", "route.js"), "utf8");
  const del = route.slice(route.indexOf("export async function DELETE"));
  assert.match(del, /getAdminEventBookingAccess\(actor, booking\.eventId, "MANAGE_EVENT_BOOKINGS"\)/);
});

test("both screens offer the undo and neither invents its own rules", async () => {
  const scanner = await readFile(repo("src", "components", "admin", "TicketScanner.jsx"), "utf8");
  const dashboard = await readFile(repo("src", "components", "admin", "EventBookingDashboard.jsx"), "utf8");
  assert.match(scanner, /method: "DELETE"/);
  assert.match(scanner, /CHECK_IN_NOT_YOURS/, "the officer must be told why an undo was refused");
  assert.match(dashboard, /method: "DELETE"/);
  // The desk confirms by name: the row under the cursor is what was just
  // misread.
  assert.match(dashboard, /window\.confirm\([\s\S]{0,120}booking\.fullName/);
});
