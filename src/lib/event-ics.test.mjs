import assert from "node:assert/strict";
import test from "node:test";

import { buildEventIcs, icsDate, icsEscape, icsFold } from "./event-ics.mjs";

const BASE = {
  uid: "event-1@moc.gov.sy",
  title: "أمسية موسيقية",
  start: "2026-08-14T17:30:00.000Z",
  stamp: "2026-08-05T09:00:00.000Z",
};

function lines(ics) {
  return ics.split("\r\n");
}

test("dates are emitted as RFC 5545 UTC stamps", () => {
  assert.equal(icsDate("2026-08-14T17:30:00.000Z"), "20260814T173000Z");
  assert.throws(() => icsDate("not a date"), /Invalid calendar date/);
});

test("special characters are escaped, never dropped", () => {
  assert.equal(icsEscape("a,b;c\\d"), "a\\,b\\;c\\\\d");
  assert.equal(icsEscape("line1\nline2"), "line1\\nline2");
  assert.equal(icsEscape("line1\r\nline2"), "line1\\nline2");
});

test("folding counts octets so Arabic lines stay within the limit", () => {
  const folded = icsFold(`SUMMARY:${"م".repeat(120)}`);
  const encoder = new TextEncoder();
  for (const line of folded.split("\r\n")) {
    assert.ok(encoder.encode(line).length <= 75, `line too long: ${encoder.encode(line).length}`);
  }
  // Folding must be reversible: unfolding restores the original content.
  assert.equal(folded.split("\r\n ").join(""), `SUMMARY:${"م".repeat(120)}`);
});

test("a minimal event produces a well-formed single-event calendar", () => {
  const ics = buildEventIcs(BASE);
  const rows = lines(ics);
  assert.equal(rows[0], "BEGIN:VCALENDAR");
  assert.equal(rows.at(-2), "END:VCALENDAR");
  assert.ok(ics.endsWith("\r\n"));
  assert.ok(ics.includes("DTSTART:20260814T173000Z"));
  // No declared end: defaults to two hours after the start.
  assert.ok(ics.includes("DTEND:20260814T193000Z"));
  assert.ok(ics.includes("DTSTAMP:20260805T090000Z"));
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 1);
});

test("an explicit end date wins over the default duration", () => {
  const ics = buildEventIcs({ ...BASE, end: "2026-08-14T21:00:00.000Z" });
  assert.ok(ics.includes("DTEND:20260814T210000Z"));
});

test("the description is stripped of markup and bounded", () => {
  const ics = buildEventIcs({
    ...BASE,
    description: `<p>وصف <strong>مهم</strong> &amp; واضح</p>${"ـ".repeat(2000)}`,
    location: "دار الأوبرا, دمشق",
  });
  assert.ok(ics.includes("وصف مهم & واضح"));
  assert.ok(!ics.includes("<strong>"));
  assert.ok(ics.includes("LOCATION:دار الأوبرا\\, دمشق"));
  const description = ics.split("\r\n").find((line) => line.startsWith("DESCRIPTION:"));
  assert.ok(description, "a description line is present");
});

test("optional fields are omitted rather than emitted empty", () => {
  const ics = buildEventIcs(BASE);
  assert.ok(!ics.includes("LOCATION:"));
  assert.ok(!ics.includes("URL:"));
  assert.ok(!ics.includes("DESCRIPTION:"));
});

test("an entry without the required fields is refused", () => {
  assert.throws(() => buildEventIcs({ title: "x", start: BASE.start }), /uid, a title and a start/);
  assert.throws(() => buildEventIcs({ uid: "x", start: BASE.start }), /uid, a title and a start/);
  assert.throws(() => buildEventIcs({ uid: "x", title: "y" }), /uid, a title and a start/);
});
