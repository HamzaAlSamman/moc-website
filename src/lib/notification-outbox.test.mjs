import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  backoffDelayMs,
  createNotificationOutboxProcessor,
  isOutboxCronAuthorized,
  renderOutboxNotification,
} from "./notification-outbox-core.mjs";

test("cron bearer authorization requires the configured secret", () => {
  const secret = "a-secure-outbox-cron-secret-with-32-chars";
  assert.equal(isOutboxCronAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(isOutboxCronAuthorized("Bearer wrong", secret), false);
  assert.equal(isOutboxCronAuthorized(null, secret), false);
  assert.throws(() => isOutboxCronAuthorized(`Bearer ${secret}`, "short"), /32/);
});

test("backoff doubles from one minute and caps at one day", () => {
  assert.equal(backoffDelayMs(1), 60_000);
  assert.equal(backoffDelayMs(2), 120_000);
  assert.equal(backoffDelayMs(20), 86_400_000);
});

test("processor sends claimed rows once and records retry or terminal failure", async () => {
  const rows = [
    { id: "ok", type: "BOOKING_CONFIRMED", recipient: "ok@example.test", payloadJson: {}, attempts: 1, maxAttempts: 8 },
    { id: "retry", type: "BOOKING_PROMOTED", recipient: "retry@example.test", payloadJson: {}, attempts: 2, maxAttempts: 8 },
    { id: "fail", type: "EVENT_CANCELLED", recipient: "fail@example.test", payloadJson: {}, attempts: 8, maxAttempts: 8 },
  ];
  const writes = [];
  const processor = createNotificationOutboxProcessor({
    repository: {
      claimBatch: async () => rows,
      markSent: async (row) => writes.push(["sent", row.id]),
      markFailed: async (row, failure) => writes.push([failure.terminal ? "failed" : "retry", row.id, failure.error]),
    },
    send: async (row) => { if (row.id !== "ok") throw new Error(`smtp ${row.recipient}`); },
    now: () => new Date("2026-08-03T10:00:00Z"),
  });
  const result = await processor.process({ workerId: "worker-1", batchSize: 50 });
  assert.deepEqual(result, { claimed: 3, sent: 1, retried: 1, failed: 1 });
  assert.deepEqual(writes.map((write) => write.slice(0, 2)), [["sent", "ok"], ["retry", "retry"], ["failed", "fail"]]);
  assert.ok(!writes[1][2].includes("retry@example.test"), "stored errors must not contain recipients");
});

test("notification renderer escapes payload and covers booking and identity types", () => {
  for (const type of [
    "BOOKING_CONFIRMED", "BOOKING_WAITLISTED", "BOOKING_PROMOTED",
    "BOOKING_CANCELLED", "EVENT_CANCELLED", "CITIZEN_IDENTITY_VERIFIED",
    "CITIZEN_IDENTITY_REJECTED",
  ]) {
    const message = renderOutboxNotification(type, {
      fullName: "<script>x</script>", referenceNo: "BKG-2026-0001", reason: "<b>reason</b>",
      eventTitle: "أمسية ثقافية", eventStart: "2026-08-05T18:00:00Z", eventLocation: "دمشق",
    });
    assert.ok(message.subject);
    assert.ok(message.html);
    assert.ok(message.text);
    assert.doesNotMatch(message.html, /<script>|<b>reason<\/b>/);
  }
});

test("database worker uses skip-locked claiming and the internal route is bearer protected", async () => {
  const worker = await readFile(new URL("./notification-outbox.js", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/internal/process-notification-outbox/route.js", import.meta.url), "utf8");
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /lockedBy: workerId/);
  assert.match(worker, /reconcileBookedCount\(\{ apply: false \}\)/);
  assert.match(route, /authorization/);
  assert.match(route, /isOutboxCronAuthorized/);
});