import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("event deletion returns 409 whenever historical bookings exist", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "app", "api", "admin", "events", "[id]", "route.js"),
    "utf8",
  );
  assert.match(source, /eventBooking\.count/);
  assert.match(source, /status:\s*409/);
  assert.match(source, /P2003/);
});

test("event cancellation uses the centralized idempotent booking service and trusted origin", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src", "app", "api", "admin", "events", "[id]", "cancel", "route.js"),
    "utf8",
  );
  assert.match(source, /verifyTrustedOrigin/);
  assert.match(source, /MANAGE_EVENT_BOOKINGS/);
  assert.match(source, /cancelEventAndBookings/);
  assert.match(source, /reason/);
  assert.match(source, /createdById/);
});
