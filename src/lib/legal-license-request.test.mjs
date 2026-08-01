import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGAL_LICENSE_MAX_JSON_BYTES,
  LEGAL_LICENSE_TRACK_MAX_JSON_BYTES,
  readLegalLicenseJson,
} from "./legal-license-request.mjs";
import { normalizeLegalLicenseDraft } from "./legal-license-api.mjs";

test("default JSON limit accepts the largest schema-valid visual signature", async () => {
  const prefix = "data:image/png;base64,";
  const applicantSignature = prefix + "a".repeat(2_000_000 - prefix.length);
  const payload = JSON.stringify({
    licenseType: "AMATEUR_TROUPE",
    applicantSignature,
  });
  assert.ok(new TextEncoder().encode(payload).byteLength < LEGAL_LICENSE_MAX_JSON_BYTES);

  const request = new Request("http://localhost/legal-licenses", {
    method: "POST",
    body: payload,
  });
  const draft = normalizeLegalLicenseDraft(await readLegalLicenseJson(request));
  assert.equal(draft.applicantSignature.length, 2_000_000);
});

test("limited JSON reader rejects an oversized declared content length before reading", async () => {
  const request = new Request("http://localhost/legal-licenses", {
    method: "POST",
    headers: { "content-length": String(LEGAL_LICENSE_MAX_JSON_BYTES + 1) },
    body: "{}",
  });
  await assert.rejects(
    () => readLegalLicenseJson(request),
    (error) => error.code === "LEGAL_LICENSE_REQUEST_TOO_LARGE" && error.status === 413,
  );
});

test("limited JSON reader stops and cancels an oversized chunked body by actual bytes", async () => {
  const bytes = new Uint8Array(LEGAL_LICENSE_MAX_JSON_BYTES + 1).fill(0x20);
  let cancelled = false;
  const request = new Request("http://localhost/legal-licenses", {
    method: "POST",
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 100));
        controller.enqueue(bytes.subarray(100));
      },
      cancel() {
        cancelled = true;
      },
    }),
    duplex: "half",
  });
  await assert.rejects(
    () => readLegalLicenseJson(request),
    (error) => error.code === "LEGAL_LICENSE_REQUEST_TOO_LARGE" && error.status === 413,
  );
  assert.equal(cancelled, true);
});

test("limited JSON reader accepts valid chunked JSON within the limit", async () => {
  const encoder = new TextEncoder();
  const request = new Request("http://localhost/legal-licenses", {
    method: "POST",
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"licenseType":'));
        controller.enqueue(encoder.encode('"AMATEUR_TROUPE"}'));
        controller.close();
      },
    }),
    duplex: "half",
  });
  assert.deepEqual(await readLegalLicenseJson(request), {
    licenseType: "AMATEUR_TROUPE",
  });
});
test("limited JSON reader rejects empty, null, and array bodies as invalid requests", async () => {
  for (const body of ["", "null", "[]"]) {
    const request = new Request("http://localhost/legal-licenses", {
      method: "POST",
      body,
    });
    await assert.rejects(
      () => readLegalLicenseJson(request),
      (error) => error.code === "LEGAL_LICENSE_INVALID_REQUEST" && error.status === 400,
      body || "empty",
    );
  }
});
test("limited JSON reader accepts a smaller per-route maxBytes option", async () => {
  const payload = JSON.stringify({ referenceNo: "LIC-2026-0001", accessToken: "x".repeat(100) });
  assert.ok(new TextEncoder().encode(payload).byteLength < LEGAL_LICENSE_TRACK_MAX_JSON_BYTES);
  const accepted = new Request("http://localhost/legal-licenses/track", {
    method: "POST",
    body: payload,
  });
  assert.deepEqual(
    await readLegalLicenseJson(accepted, { maxBytes: LEGAL_LICENSE_TRACK_MAX_JSON_BYTES }),
    { referenceNo: "LIC-2026-0001", accessToken: "x".repeat(100) },
  );

  const rejected = new Request("http://localhost/legal-licenses/track", {
    method: "POST",
    body: payload,
  });
  await assert.rejects(
    () => readLegalLicenseJson(rejected, { maxBytes: 32 }),
    (error) => error.code === "LEGAL_LICENSE_REQUEST_TOO_LARGE" && error.status === 413,
  );
});
