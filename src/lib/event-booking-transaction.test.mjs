import assert from "node:assert/strict";
import test from "node:test";

import { isRetryableBookingTransactionError, runWithBookingTransactionRetry } from "./event-booking-transaction.mjs";

test("recognizes Prisma, serialization, and deadlock retry codes", () => {
  for (const error of [{ code: "P2034" }, { code: "40001" }, { code: "40P01" }, { cause: { code: "40P01" } }, { meta: { code: "40001" } }]) {
    assert.equal(isRetryableBookingTransactionError(error), true);
  }
  assert.equal(isRetryableBookingTransactionError({ code: "P2002" }), false);
});

test("retries a transaction at most three times with bounded waits", async () => {
  let attempts = 0; const waits = [];
  const value = await runWithBookingTransactionRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw { code: attempts === 1 ? "40001" : "40P01" };
    return "ok";
  }, { wait: async (ms) => waits.push(ms), random: () => 0 });
  assert.equal(value, "ok");
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [25, 50]);

  attempts = 0;
  await assert.rejects(() => runWithBookingTransactionRetry(async () => { attempts += 1; throw { code: "P2034" }; }, { wait: async () => {}, random: () => 0 }), (error) => error.code === "P2034");
  assert.equal(attempts, 3);
});
