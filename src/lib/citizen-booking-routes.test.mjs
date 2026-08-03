import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = (...parts) => path.join(process.cwd(), "src", "app", "api", ...parts, "route.js");

test("citizen booking mutation routes require citizen sessions, trusted origins, rate limits, and no-store", async () => {
  const files = [
    root("citizen", "events", "[id]", "book"),
    root("citizen", "bookings", "[id]", "cancel"),
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.match(source, /getCitizenSession/);
    assert.match(source, /requireCitizenAuthOrigin/);
    assert.match(source, /rateLimit/);
    assert.match(source, /Cache-Control.*no-store/);
    assert.match(source, /force-dynamic/);
  }
});

test("my bookings and public booking status expose no-store GET endpoints without identity hashes", async () => {
  const mine = await readFile(root("citizen", "bookings"), "utf8");
  const status = await readFile(root("events", "[id]", "booking-status"), "utf8");
  assert.match(mine, /export\s+async\s+function\s+GET/);
  assert.match(mine, /getCitizenSession/);
  assert.match(mine, /Cache-Control.*no-store/);
  assert.doesNotMatch(mine, /nationalIdHash:\s*true/);
  assert.match(status, /remainingSpots/);
  assert.match(status, /bookingWindowState/);
  assert.match(status, /Cache-Control.*no-store/);
  assert.doesNotMatch(status, /citizen|email|phone|nationalId/i);
});
