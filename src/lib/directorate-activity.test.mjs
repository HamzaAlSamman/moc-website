import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { ARABIC_MONTHS, buildMonthOptions, monthLabel, monthRange, parseMonthParam } from "./directorate-activity.mjs";

test("only a well-formed YYYY-MM parses", () => {
  assert.deepEqual(parseMonthParam("2026-09"), { year: 2026, month: 9 });
  assert.deepEqual(parseMonthParam("2026-01"), { year: 2026, month: 1 });
  assert.deepEqual(parseMonthParam("2026-12"), { year: 2026, month: 12 });
  for (const bad of ["", "2026", "2026-00", "2026-13", "26-09", "2026/09", "2026-9", "'; DROP TABLE Event;--"]) {
    assert.equal(parseMonthParam(bad), null, `expected "${bad}" to be rejected`);
  }
  assert.equal(parseMonthParam(undefined), null);
});

test("a month range is UTC and end-exclusive, so it never leaks into the next month", () => {
  const range = monthRange("2026-09");
  assert.equal(range.start.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("December rolls the range into the next year without special-casing", () => {
  const range = monthRange("2026-12");
  assert.equal(range.start.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(range.end.toISOString(), "2027-01-01T00:00:00.000Z");
});

test("a malformed month has no range and no label", () => {
  assert.equal(monthRange("not-a-month"), null);
  assert.equal(monthLabel("not-a-month"), "");
});

test("the label uses the site's existing Levantine month names", () => {
  assert.equal(monthLabel("2026-09"), "أيلول 2026");
  assert.equal(monthLabel("2026-01"), "كانون الثاني 2026");
  assert.equal(ARABIC_MONTHS.length, 12);
});

test("the option list covers the current year even with no extra years given", () => {
  const now = new Date("2026-09-08T00:00:00Z");
  const options = buildMonthOptions(now, []);
  assert.equal(options.length, 12);
  assert.equal(options[0].value, "2026-01");
  assert.equal(options[8].value, "2026-09");
  assert.equal(options[8].labelAr, "أيلول 2026");
});

test("a directorate's only event outside the current year still gets a reachable option", () => {
  const now = new Date("2026-09-08T00:00:00Z");
  const options = buildMonthOptions(now, [2025, 2026]);
  assert.equal(options.length, 24);
  assert.ok(options.some((o) => o.value === "2025-01"));
  assert.ok(options.some((o) => o.value === "2026-12"));
});

test("duplicate years (current year re-supplied as an extra) do not duplicate the list", () => {
  const now = new Date("2026-09-08T00:00:00Z");
  const options = buildMonthOptions(now, [2026, 2026]);
  assert.equal(options.length, 12);
});

// The dashboard filters createdById groups by startDate only when a month is
// selected; unfiltered, every event a directorate ever added still counts —
// changing that boundary would silently redefine "silent directorate".
test("the dashboard only narrows by month when one is actually selected", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "app", "admin", "dashboard", "page.js"),
    "utf8",
  );
  assert.match(source, /dirMonthRange \? \{ startDate: \{ gte: dirMonthRange\.start, lt: dirMonthRange\.end \} \} : \{\}/);
  assert.match(source, /parseMonthParam\(params\?\.dirMonth\)/);
});
