import {
  privateUploadRoot,
  randomStorageKey,
  readPrivateFile,
  removePrivateFile,
  validateUpload,
  writePrivateFile,
} from "./private-file-storage.mjs";

// Private-file storage for Internal Oversight complaint and International
// Cooperation message image attachments. These used to exist only as mail
// attachments (see git history) — never written to disk or referenced by the
// database — so an admin could not review them after the fact if the mail
// was lost. Thin wrapper around private-file-storage.mjs, following the same
// pattern as legal-license-storage.mjs / citizen-identity-storage.mjs.

export const COMPLAINT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const COMPLAINT_IMAGE_ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_MIME = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
});

export function validateComplaintImage({ bytes, declaredMimeType }) {
  return validateUpload({
    bytes,
    declaredMimeType,
    allowedMimeTypes: COMPLAINT_IMAGE_ALLOWED_MIME_TYPES,
    maxFileBytes: COMPLAINT_IMAGE_MAX_BYTES,
  });
}

export function complaintStorageKey(scopeId, mimeType) {
  return randomStorageKey(scopeId, mimeType, EXTENSION_BY_MIME);
}

export function complaintUploadRoot(subdir) {
  return privateUploadRoot(subdir);
}

export async function writeComplaintFile(subdir, storageKey, bytes) {
  return writePrivateFile(complaintUploadRoot(subdir), storageKey, bytes);
}

export async function readComplaintFile(subdir, storageKey) {
  return readPrivateFile(complaintUploadRoot(subdir), storageKey);
}

export async function removeComplaintFile(subdir, storageKey) {
  return removePrivateFile(complaintUploadRoot(subdir), storageKey);
}
