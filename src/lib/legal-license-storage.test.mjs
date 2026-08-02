import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGAL_LICENSE_ALLOWED_MIME_TYPES,
  LEGAL_LICENSE_MAX_FILE_BYTES,
  LEGAL_LICENSE_MAX_REQUEST_BYTES,
  createLegalLicenseAccessToken,
  detectLegalLicenseMimeType,
  hashLegalLicenseAccessToken,
  legalLicenseStorageKey,
  legalLicenseUploadRequestTooLarge,
  validateLegalLicenseUpload,
} from "./legal-license-storage.mjs";

test("access tokens are random, separate from references, and stored as hashes", () => {
  const first = createLegalLicenseAccessToken();
  const second = createLegalLicenseAccessToken();

  assert.match(first, /^[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(first, second);
  assert.equal(hashLegalLicenseAccessToken(first).length, 64);
  assert.equal(hashLegalLicenseAccessToken(first), hashLegalLicenseAccessToken(first));
  assert.notEqual(hashLegalLicenseAccessToken(first), first);
  assert.doesNotMatch(first, /^LIC-\d{4}-\d{4}$/);
});

test("actual file signatures determine the accepted MIME type", () => {
  const pdf = Buffer.from("%PDF-1.7\n");
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = Buffer.from("RIFF0000WEBP", "ascii");

  assert.equal(detectLegalLicenseMimeType(pdf), "application/pdf");
  assert.equal(detectLegalLicenseMimeType(jpeg), "image/jpeg");
  assert.equal(detectLegalLicenseMimeType(png), "image/png");
  assert.equal(detectLegalLicenseMimeType(webp), "image/webp");
  assert.equal(detectLegalLicenseMimeType(Buffer.from("<script>")), null);
});

test("upload validation rejects spoofing, oversized files, and oversized requests", () => {
  const pdf = Buffer.from("%PDF-1.7\n");
  assert.deepEqual(
    validateLegalLicenseUpload({
      bytes: pdf,
      declaredMimeType: "application/pdf",
      currentRequestBytes: 0,
    }),
    { mimeType: "application/pdf", size: pdf.length },
  );

  assert.throws(
    () => validateLegalLicenseUpload({
      bytes: pdf,
      declaredMimeType: "image/png",
      currentRequestBytes: 0,
    }),
    /does not match/i,
  );
  assert.throws(
    () => validateLegalLicenseUpload({
      bytes: Buffer.alloc(LEGAL_LICENSE_MAX_FILE_BYTES + 1),
      declaredMimeType: "application/pdf",
      currentRequestBytes: 0,
    }),
    /5 MB/i,
  );
  assert.throws(
    () => validateLegalLicenseUpload({
      bytes: pdf,
      declaredMimeType: "application/pdf",
      currentRequestBytes: LEGAL_LICENSE_MAX_REQUEST_BYTES,
    }),
    /75 MB/i,
  );
  assert.deepEqual([...LEGAL_LICENSE_ALLOWED_MIME_TYPES].sort(), [
    "application/pdf", "image/jpeg", "image/png", "image/webp",
  ]);
});

test("storage keys are random, relative, and never contain user filenames", () => {
  const key = legalLicenseStorageKey("app_123", "passport ../../evil.pdf", "application/pdf");
  assert.match(key, /^app_123\/[a-f0-9-]+\.pdf$/);
  assert.equal(key.includes("passport"), false);
  assert.equal(key.includes(".."), false);
  assert.equal(key.startsWith("/") || /^[A-Za-z]:/.test(key), false);
});
test("multipart upload length is bounded before form parsing", () => {
  const request = (value) => ({ headers: new Headers(value == null ? {} : { "content-length": String(value) }) });
  assert.equal(legalLicenseUploadRequestTooLarge(request(LEGAL_LICENSE_MAX_FILE_BYTES)), false);
  assert.equal(legalLicenseUploadRequestTooLarge(request(LEGAL_LICENSE_MAX_FILE_BYTES + 2 * 1024 * 1024)), true);
  assert.equal(legalLicenseUploadRequestTooLarge(request(null)), true);
});