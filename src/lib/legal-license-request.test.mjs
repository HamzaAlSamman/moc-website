import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGAL_LICENSE_MAX_JSON_BYTES,
  readLegalLicenseJson,
} from "./legal-license-request.mjs";

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
