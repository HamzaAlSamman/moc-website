import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const LEGAL_LICENSE_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const LEGAL_LICENSE_MAX_REQUEST_BYTES = 75 * 1024 * 1024;
export const LEGAL_LICENSE_UPLOAD_HTTP_OVERHEAD_BYTES = 1024 * 1024;
export const LEGAL_LICENSE_ALLOWED_MIME_TYPES = Object.freeze([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_MIME = Object.freeze({
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
});

export function createLegalLicenseAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashLegalLicenseAccessToken(token) {
  if (typeof token !== "string" || token.length < 20) {
    throw new Error("Invalid legal-license access token");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function legalLicenseAccessTokenMatches(token, expectedHash) {
  try {
    const actual = Buffer.from(hashLegalLicenseAccessToken(token), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function detectLegalLicenseMimeType(bytes) {
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

export function legalLicenseUploadRequestTooLarge(request) {
  const rawLength = request?.headers?.get?.("content-length");
  if (!rawLength) return true;
  const contentLength = Number(rawLength);
  return !Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > LEGAL_LICENSE_MAX_FILE_BYTES + LEGAL_LICENSE_UPLOAD_HTTP_OVERHEAD_BYTES;
}
export function validateLegalLicenseUpload({ bytes, declaredMimeType, currentRequestBytes = 0 }) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes ?? []);
  if (bytes.length === 0) throw new Error("The uploaded file is empty");
  if (bytes.length > LEGAL_LICENSE_MAX_FILE_BYTES) {
    throw new Error("Each file must be 5 MB or smaller");
  }
  if (currentRequestBytes + bytes.length > LEGAL_LICENSE_MAX_REQUEST_BYTES) {
    throw new Error("All request files together must be 75 MB or smaller");
  }
  if (!LEGAL_LICENSE_ALLOWED_MIME_TYPES.includes(declaredMimeType)) {
    throw new Error("Unsupported declared file type");
  }
  const mimeType = detectLegalLicenseMimeType(bytes);
  if (!mimeType) throw new Error("Unsupported file signature");
  if (mimeType !== declaredMimeType) {
    throw new Error("Declared file type does not match the actual file signature");
  }
  return { mimeType, size: bytes.length };
}

export function legalLicenseStorageKey(applicationId, _originalName, mimeType) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(applicationId)) {
    throw new Error("Invalid application id");
  }
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) throw new Error("Unsupported file type");
  return `${applicationId}/${randomUUID()}${extension}`;
}

export function legalLicensePrivateUploadRoot() {
  return path.resolve(
    process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "private-uploads"),
    "legal-licenses",
  );
}

export function resolveLegalLicenseStoragePath(storageKey) {
  if (typeof storageKey !== "string" || storageKey.includes("\\") || path.isAbsolute(storageKey)) {
    throw new Error("Invalid storage key");
  }
  const root = legalLicensePrivateUploadRoot();
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function writeLegalLicensePrivateFile(storageKey, bytes) {
  const destination = resolveLegalLicenseStoragePath(storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
  return destination;
}

export async function readLegalLicensePrivateFile(storageKey) {
  return readFile(resolveLegalLicenseStoragePath(storageKey));
}

export async function removeLegalLicensePrivateFile(storageKey) {
  await unlink(resolveLegalLicenseStoragePath(storageKey)).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}