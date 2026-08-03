import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("booking references reuse the shared atomic reference allocator with BKG scope", async () => {
  const referenceSource = await readFile(new URL("./reference-number.js", import.meta.url), "utf8");
  const bookingSource = await readFile(new URL("./event-booking-service.js", import.meta.url), "utf8");
  assert.match(referenceSource, /BOOKING:\s*"BKG"/);
  assert.match(referenceSource, /nextReferenceNumberWithClient/);
  assert.match(referenceSource, /referenceCounter\.upsert/);
  assert.match(referenceSource, /seq:\s*\{\s*increment:\s*1\s*\}/);
  assert.match(referenceSource, /error\?\.code\s*===\s*"P2002"/);
  assert.match(bookingSource, /nextReferenceNumberWithClient\(tx,\s*REFERENCE_SCOPES\.BOOKING/);
});
