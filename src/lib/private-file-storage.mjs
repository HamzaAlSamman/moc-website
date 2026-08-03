import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Generic private-file storage: magic-byte sniffing, path-traversal-safe
// read/write/remove under PRIVATE_UPLOAD_DIR, and random access tokens.
//
// Extracted from src/lib/legal-license-storage.mjs (which now wraps this
// module and keeps its exact original exports — every existing caller is
// unaffected). src/lib/citizen-identity-storage.mjs is the second caller,
// for identity-document photos. Neither wrapper changes this module's
// behavior; they only narrow which MIME types and size limits apply.
// ─────────────────────────────────────────────────────────────────────────────

export function detectMimeType(bytes) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes ?? []);
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * @param {object} opts
 * @param {Buffer} opts.bytes
 * @param {string} opts.declaredMimeType client-declared Content-Type
 * @param {readonly string[]} opts.allowedMimeTypes
 * @param {number} opts.maxFileBytes
 * @param {number} [opts.maxRequestBytes] omit to skip the whole-request check
 * @param {number} [opts.currentRequestBytes]
 */
export function validateUpload({
  bytes,
  declaredMimeType,
  allowedMimeTypes,
  maxFileBytes,
  maxRequestBytes,
  currentRequestBytes = 0,
}) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes ?? []);
  if (bytes.length === 0) throw new Error("The uploaded file is empty");
  if (bytes.length > maxFileBytes) {
    throw new Error(`Each file must be ${Math.round(maxFileBytes / (1024 * 1024))} MB or smaller`);
  }
  if (maxRequestBytes != null && currentRequestBytes + bytes.length > maxRequestBytes) {
    throw new Error(`All request files together must be ${Math.round(maxRequestBytes / (1024 * 1024))} MB or smaller`);
  }
  if (!allowedMimeTypes.includes(declaredMimeType)) {
    throw new Error("Unsupported declared file type");
  }
  const mimeType = detectMimeType(bytes);
  if (!mimeType) throw new Error("Unsupported file signature");
  if (mimeType !== declaredMimeType) {
    throw new Error("Declared file type does not match the actual file signature");
  }
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error("Unsupported file signature");
  }
  return { mimeType, size: bytes.length };
}

/**
 * @param {string} scopeId e.g. an applicationId or citizenId — namespaces the key
 * @param {string} mimeType
 * @param {Record<string, string>} extensionByMime
 */
export function randomStorageKey(scopeId, mimeType, extensionByMime) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(scopeId)) {
    throw new Error("Invalid storage scope id");
  }
  const extension = extensionByMime[mimeType];
  if (!extension) throw new Error("Unsupported file type");
  return `${scopeId}/${randomUUID()}${extension}`;
}

export function privateUploadRoot(subdir) {
  return path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "private-uploads"), subdir);
}

export function resolveStoragePath(root, storageKey) {
  if (typeof storageKey !== "string" || storageKey.includes("\\") || path.isAbsolute(storageKey)) {
    throw new Error("Invalid storage key");
  }
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function writePrivateFile(root, storageKey, bytes) {
  const destination = resolveStoragePath(root, storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
  return destination;
}

export async function readPrivateFile(root, storageKey) {
  return readFile(resolveStoragePath(root, storageKey));
}

export async function removePrivateFile(root, storageKey) {
  await unlink(resolveStoragePath(root, storageKey)).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token) {
  if (typeof token !== "string" || token.length < 20) {
    throw new Error("Invalid access token");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function accessTokenMatches(token, expectedHash) {
  try {
    const actual = Buffer.from(hashAccessToken(token), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function uploadRequestTooLarge(request, maxFileBytes, httpOverheadBytes) {
  const rawLength = request?.headers?.get?.("content-length");
  if (!rawLength) return true;
  const contentLength = Number(rawLength);
  return !Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > maxFileBytes + httpOverheadBytes;
}
