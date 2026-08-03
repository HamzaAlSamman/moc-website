import {
  accessTokenMatches,
  createAccessToken,
  detectMimeType,
  hashAccessToken,
  privateUploadRoot,
  randomStorageKey,
  readPrivateFile,
  removePrivateFile,
  resolveStoragePath,
  uploadRequestTooLarge,
  validateUpload,
  writePrivateFile,
} from "./private-file-storage.mjs";

// Thin legal-license-specific wrapper around the generic private-file-storage
// module. Every export here keeps its original name and behavior — this file
// used to contain the implementation directly; it was extracted to
// private-file-storage.mjs so src/lib/citizen-identity-storage.mjs could
// reuse the same magic-byte checks, path-traversal-safe I/O, and token
// hashing without duplicating them. No caller of this file needs to change.

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

export const createLegalLicenseAccessToken = createAccessToken;
export const hashLegalLicenseAccessToken = hashAccessToken;
export const legalLicenseAccessTokenMatches = accessTokenMatches;
export const detectLegalLicenseMimeType = detectMimeType;

export function legalLicenseUploadRequestTooLarge(request) {
  return uploadRequestTooLarge(request, LEGAL_LICENSE_MAX_FILE_BYTES, LEGAL_LICENSE_UPLOAD_HTTP_OVERHEAD_BYTES);
}

export function validateLegalLicenseUpload({ bytes, declaredMimeType, currentRequestBytes = 0 }) {
  return validateUpload({
    bytes,
    declaredMimeType,
    allowedMimeTypes: LEGAL_LICENSE_ALLOWED_MIME_TYPES,
    maxFileBytes: LEGAL_LICENSE_MAX_FILE_BYTES,
    maxRequestBytes: LEGAL_LICENSE_MAX_REQUEST_BYTES,
    currentRequestBytes,
  });
}

export function legalLicenseStorageKey(applicationId, _originalName, mimeType) {
  return randomStorageKey(applicationId, mimeType, EXTENSION_BY_MIME);
}

export function legalLicensePrivateUploadRoot() {
  return privateUploadRoot("legal-licenses");
}

export function resolveLegalLicenseStoragePath(storageKey) {
  return resolveStoragePath(legalLicensePrivateUploadRoot(), storageKey);
}

export async function writeLegalLicensePrivateFile(storageKey, bytes) {
  return writePrivateFile(legalLicensePrivateUploadRoot(), storageKey, bytes);
}

export async function readLegalLicensePrivateFile(storageKey) {
  return readPrivateFile(legalLicensePrivateUploadRoot(), storageKey);
}

export async function removeLegalLicensePrivateFile(storageKey) {
  return removePrivateFile(legalLicensePrivateUploadRoot(), storageKey);
}
