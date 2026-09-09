import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// Source-shape checks, in the style of admin-booking-routes.test.mjs. What
// they defend: statistics counted in the database rather than over the capped
// booking list, and a directorate seeing figures for its own events only.

const repo = (...parts) => path.join(process.cwd(), ...parts);

test("statistics are counted in the database, never over the capped row list", async () => {
  const page = await readFile(repo("src", "app", "admin", "events", "[id]", "bookings", "page.js"), "utf8");
  const route = await readFile(repo("src", "app", "api", "admin", "events", "[id]", "bookings", "route.js"), "utf8");
  for (const source of [page, route]) {
    assert.match(source, /getEventBookingStats/);
    // `take: 5000` truncates the list; deriving figures from it would
    // under-report a large festival while looking perfectly plausible.
    assert.match(source, /take: 5000/);
    assert.doesNotMatch(source, /summarizeEventBookings\(bookings/);
  }
});

test("both the page and its refresh route go through the same summarizer", async () => {
  const query = await readFile(repo("src", "lib", "event-booking-stats-query.js"), "utf8");
  assert.match(query, /groupBy/);
  assert.match(query, /by: \["status", "attendanceStatus", "source"\]/);
  assert.match(query, /summarizeEventBookings/);
  assert.match(query, /server-only/);
});

test("the bookings landing page scopes a directorate to its own events", async () => {
  const page = await readFile(repo("src", "app", "admin", "bookings", "page.js"), "utf8");
  assert.match(page, /VIEW_EVENT_BOOKINGS/);
  assert.match(page, /role === "DIRECTORATE" \? \{ createdById: user\.id \}/);
  // One cross-tab for the page, not a query per card.
  assert.match(page, /getEventBookingStatsMap/);
});

test("the detail page still enforces per-event ownership before showing figures", async () => {
  const page = await readFile(repo("src", "app", "admin", "events", "[id]", "bookings", "page.js"), "utf8");
  assert.match(page, /getAdminEventBookingAccess\(user, id, "VIEW_EVENT_BOOKINGS"\)/);
  assert.match(page, /if \(!access\.ok\) redirect/);
  const access = await readFile(repo("src", "lib", "admin-event-booking-access.js"), "utf8");
  assert.match(access, /session\.role === "DIRECTORATE" && event\.createdById !== actorId/);
});

test("closing attendance has a caller, is scoped, and is audited", async () => {
  const route = await readFile(
    repo("src", "app", "api", "admin", "events", "[id]", "close-attendance", "route.js"),
    "utf8",
  );
  // markNoShows sat in the service with no caller, so NO_SHOW was never
  // written and every event reported 100% attendance after one check-in.
  assert.match(route, /markNoShows/);
  assert.match(route, /MANAGE_EVENT_BOOKINGS/);
  assert.match(route, /verifyTrustedOrigin/);
  assert.match(route, /auditLog\.create/);
  assert.match(route, /EVENT_ATTENDANCE_CLOSED/);
  // The service refuses before the event ends; the route must surface that
  // rather than turn it into a 500.
  assert.match(route, /EVENT_NOT_ENDED/);
});

test("the register filters attendance the same way the statistics count it", async () => {
  const dashboard = await readFile(repo("src", "components", "admin", "EventBookingDashboard.jsx"), "utf8");
  // A cancelled booking keeps NOT_CHECKED_IN forever; counting it under
  // "لم يُسجّلوا" would contradict the panel directly above it.
  assert.match(dashboard, /const isActive = \(row\) => row\.status !== "CANCELLED"/);
  assert.match(dashboard, /isActive\(row\) && row\.attendanceStatus === "NO_SHOW"/);
  assert.match(dashboard, /close-attendance/);
  // Raw enum values must not reach an otherwise Arabic table.
  assert.match(dashboard, /NOT_CHECKED_IN: "لم يُسجّل بعد"/);
  assert.match(dashboard, /CONFIRMED: "مؤكد"/);
});

test("the statistics panel renders figures without recomputing them", async () => {
  const panel = await readFile(repo("src", "components", "admin", "EventBookingStats.jsx"), "utf8");
  // Two views of one event must never disagree because one of them did its
  // own arithmetic. Rates arrive already computed; the panel only words them.
  assert.doesNotMatch(panel, /Math\.round/, "rates belong to the summarizer, not the view");
  assert.doesNotMatch(panel, /from ["'][^"']*event-booking-stats/, "the view must not summarize anything itself");
  assert.match(panel, /attendanceRate/);
  assert.match(panel, /turnoutRate/);
});
