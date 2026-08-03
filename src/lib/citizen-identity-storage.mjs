import {
  detectMimeType,
  privateUploadRoot,
  randomStorageKey,
  readPrivateFile,
  removePrivateFile,
  resolveStoragePath,
  uploadRequestTooLarge,
  validateUpload,
  writePrivateFile,
} from "./private-file-storage.mjs";

// Citizen identity-document photos (front/back of a national ID). Narrower
// than legal-license attachments: images only, no PDF — see plan section
// 19.3. Built on the same generic private-file-storage primitives so the
// magic-byte checks, path-traversal-safe I/O, and storage layout are
// identical to (and battle-tested by) the legal-license upload path.
//
// Files are never made public and never linked in email — access is only
// through an admin-authenticated, audit-logged download route (plan
// sections 9.3 and 27). See src/app/api/admin/citizens/[id]/identity/[side]/route.js.

export const CITIZEN_IDENTITY_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const CITIZEN_IDENTITY_UPLOAD_HTTP_OVERHEAD_BYTES = 1024 * 1024;
export const CITIZEN_IDENTITY_ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_MIME = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
});

export const detectCitizenIdentityMimeType = detectMimeType;

export function citizenIdentityUploadRequestTooLarge(request) {
  return uploadRequestTooLarge(
    request,
    CITIZEN_IDENTITY_MAX_FILE_BYTES,
    CITIZEN_IDENTITY_UPLOAD_HTTP_OVERHEAD_BYTES
  );
}

export function validateCitizenIdentityUpload({ bytes, declaredMimeType }) {
  // No currentRequestBytes/maxRequestBytes: front+back are two independent
  // uploads (see plan 19.2), each checked against CITIZEN_IDENTITY_MAX_FILE_BYTES
  // on its own — there is no combined-request budget to enforce.
  return validateUpload({
    bytes,
    declaredMimeType,
    allowedMimeTypes: CITIZEN_IDENTITY_ALLOWED_MIME_TYPES,
    maxFileBytes: CITIZEN_IDENTITY_MAX_FILE_BYTES,
  });
}

export function citizenIdentityStorageKey(citizenId, mimeType) {
  return randomStorageKey(citizenId, mimeType, EXTENSION_BY_MIME);
}

export function citizenIdentityPrivateUploadRoot() {
  return privateUploadRoot("citizen-identity");
}

export function resolveCitizenIdentityStoragePath(storageKey) {
  return resolveStoragePath(citizenIdentityPrivateUploadRoot(), storageKey);
}

export async function writeCitizenIdentityPrivateFile(storageKey, bytes) {
  return writePrivateFile(citizenIdentityPrivateUploadRoot(), storageKey, bytes);
}

export async function readCitizenIdentityPrivateFile(storageKey) {
  return readPrivateFile(citizenIdentityPrivateUploadRoot(), storageKey);
}

export async function removeCitizenIdentityPrivateFile(storageKey) {
  return removePrivateFile(citizenIdentityPrivateUploadRoot(), storageKey);
}
