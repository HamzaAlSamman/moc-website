import assert from "node:assert/strict";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

process.env.PRIVATE_UPLOAD_DIR = await mkdtemp(path.join(os.tmpdir(), "citizen-identity-test-"));

const {
  CITIZEN_IDENTITY_ALLOWED_MIME_TYPES,
  CITIZEN_IDENTITY_MAX_FILE_BYTES,
  validateCitizenIdentityUpload,
  citizenIdentityStorageKey,
  citizenIdentityPrivateUploadRoot,
  writeCitizenIdentityPrivateFile,
  readCitizenIdentityPrivateFile,
  removeCitizenIdentityPrivateFile,
} = await import("./citizen-identity-storage.mjs");

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 1, 2, 3, 4]);
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const FAKE_PDF_BYTES = Buffer.from("%PDF-1.7\nnot really an image");

test("only JPEG/PNG/WebP are allowed — PDF is rejected even though legal-license allows it", () => {
  assert.deepEqual(
    [...CITIZEN_IDENTITY_ALLOWED_MIME_TYPES].sort(),
    ["image/jpeg", "image/png", "image/webp"]
  );
  assert.throws(
    () => validateCitizenIdentityUpload({ bytes: FAKE_PDF_BYTES, declaredMimeType: "application/pdf" }),
    /Unsupported declared file type/
  );
});

test("a declared type that doesn't match the actual file signature is rejected", () => {
  assert.throws(
    () => validateCitizenIdentityUpload({ bytes: PNG_BYTES, declaredMimeType: "image/jpeg" }),
    /does not match the actual file signature/
  );
});

test("a valid JPEG passes validation", () => {
  const result = validateCitizenIdentityUpload({ bytes: JPEG_BYTES, declaredMimeType: "image/jpeg" });
  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.size, JPEG_BYTES.length);
});

test("a file over 5 MB is rejected", () => {
  const oversized = Buffer.concat([JPEG_BYTES, Buffer.alloc(CITIZEN_IDENTITY_MAX_FILE_BYTES)]);
  assert.throws(
    () => validateCitizenIdentityUpload({ bytes: oversized, declaredMimeType: "image/jpeg" }),
    /5 MB or smaller/
  );
});

test("storage keys are namespaced by citizenId, random, and never contain the original filename", () => {
  const keyA = citizenIdentityStorageKey("citizen123", "image/jpeg");
  const keyB = citizenIdentityStorageKey("citizen123", "image/jpeg");
  assert.match(keyA, /^citizen123\/[0-9a-f-]{36}\.jpg$/);
  assert.notEqual(keyA, keyB);
});

test("storage keys reject a scope id that isn't a safe path segment", () => {
  assert.throws(() => citizenIdentityStorageKey("../../etc", "image/jpeg"), /Invalid storage scope id/);
});

test("files are written under a citizen-identity subdirectory, not shared with legal-license storage", () => {
  assert.match(citizenIdentityPrivateUploadRoot(), /citizen-identity$/);
});

test("write/read/remove round-trips a file and 404s (ENOENT-safe) on double removal", async () => {
  const key = citizenIdentityStorageKey("citizenABC", "image/png");
  await writeCitizenIdentityPrivateFile(key, PNG_BYTES);

  const readBack = await readCitizenIdentityPrivateFile(key);
  assert.ok(readBack.equals(PNG_BYTES));

  await removeCitizenIdentityPrivateFile(key);
  await assert.rejects(() => readCitizenIdentityPrivateFile(key));

  // Removing an already-removed file must not throw (ENOENT is swallowed).
  await removeCitizenIdentityPrivateFile(key);
});

test.after(async () => {
  await rm(process.env.PRIVATE_UPLOAD_DIR, { recursive: true, force: true });
});
