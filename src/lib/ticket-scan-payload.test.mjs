import assert from "node:assert/strict";
import test from "node:test";

import {
  TICKET_SCAN_PREFIX,
  decodeTicketScanPayload,
  encodeTicketScanPayload,
  looksLikeTicketScanPayload,
} from "./ticket-scan-payload.mjs";

const SECRET = "c".repeat(32);
const OTHER_SECRET = "d".repeat(40);
const TICKET = { referenceNo: "BKG-2026-0007", code: "K7RVTQ4N2M" };

test("a payload round-trips through the same secret", () => {
  const payload = encodeTicketScanPayload(TICKET, SECRET);
  assert.deepEqual(decodeTicketScanPayload(payload, SECRET), TICKET);
});

test("the payload is not a URL and leaks neither reference nor code", () => {
  const payload = encodeTicketScanPayload(TICKET, SECRET);
  assert.ok(payload.startsWith(`${TICKET_SCAN_PREFIX}.`));
  assert.ok(!/^https?:/i.test(payload), "a generic reader must not get something it can open");
  assert.ok(!payload.includes(TICKET.referenceNo));
  assert.ok(!payload.includes(TICKET.code));
});

test("two encodings of the same ticket differ but both decode", () => {
  const first = encodeTicketScanPayload(TICKET, SECRET);
  const second = encodeTicketScanPayload(TICKET, SECRET);
  assert.notEqual(first, second, "a fresh nonce per render");
  assert.deepEqual(decodeTicketScanPayload(first, SECRET), TICKET);
  assert.deepEqual(decodeTicketScanPayload(second, SECRET), TICKET);
});

test("a payload minted with another secret is rejected, not misread", () => {
  const foreign = encodeTicketScanPayload(TICKET, OTHER_SECRET);
  assert.equal(decodeTicketScanPayload(foreign, SECRET), null);
});

test("tampering with a single character fails the authentication tag", () => {
  const payload = encodeTicketScanPayload(TICKET, SECRET);
  const index = payload.length - 3;
  const swapped = payload[index] === "A" ? "B" : "A";
  const tampered = `${payload.slice(0, index)}${swapped}${payload.slice(index + 1)}`;
  assert.equal(decodeTicketScanPayload(tampered, SECRET), null);
});

test("anything a scanner might see that is not ours decodes to null", () => {
  for (const raw of [
    "https://moc.gov.sy/ar/tickets/verify?ref=BKG-2026-0007&code=K7RVTQ4N2M",
    "WIFI:S:cafe;T:WPA;P:hunter2;;",
    "",
    "MOCT1.",
    "MOCT1.!!!not-base64!!!",
    `${TICKET_SCAN_PREFIX}.${"A".repeat(600)}`,
    null,
    undefined,
    42,
  ]) {
    assert.equal(decodeTicketScanPayload(raw, SECRET), null, `expected null for ${String(raw)}`);
  }
});

test("surrounding whitespace from a scanner is tolerated", () => {
  const payload = encodeTicketScanPayload(TICKET, SECRET);
  assert.deepEqual(decodeTicketScanPayload(`\n  ${payload}  \n`, SECRET), TICKET);
});

test("looksLikeTicketScanPayload classifies without needing the secret", () => {
  assert.equal(looksLikeTicketScanPayload(encodeTicketScanPayload(TICKET, SECRET)), true);
  assert.equal(looksLikeTicketScanPayload("https://example.com"), false);
  assert.equal(looksLikeTicketScanPayload(null), false);
});

test("a short secret is refused outright", () => {
  assert.throws(() => encodeTicketScanPayload(TICKET, "too-short"), /32 characters/);
});

test("incomplete ticket input is refused", () => {
  assert.throws(() => encodeTicketScanPayload({ referenceNo: "", code: "X" }, SECRET), /reference is required/);
  assert.throws(() => encodeTicketScanPayload({ referenceNo: "BKG-1", code: "" }, SECRET), /code is required/);
  // A reference carrying the field separator would make the payload ambiguous
  // on the way back out.
  assert.throws(
    () => encodeTicketScanPayload({ referenceNo: "BKG-1\u0000K7RVTQ4N2M", code: "X" }, SECRET),
    /reference is required/,
  );
});
