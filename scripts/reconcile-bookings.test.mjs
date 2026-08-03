import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("booking reconciliation is report-only unless an explicit repair confirmation is supplied", async () => {
  const script = await readFile(new URL("./reconcile-bookings.mjs", import.meta.url), "utf8");
  assert.match(script, /reconcileBookedCount/);
  assert.match(script, /--apply/);
  assert.match(script, /--confirm-booking-counter-repair/);
  assert.match(script, /apply: repair/);
});

test("package exposes separate report and repair commands", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(pkg.scripts["booking:reconcile"], /reconcile-bookings\.mjs/);
  assert.match(pkg.scripts["booking:reconcile:apply"], /--apply/);
  assert.match(pkg.scripts["booking:reconcile:apply"], /--confirm-booking-counter-repair/);
});
