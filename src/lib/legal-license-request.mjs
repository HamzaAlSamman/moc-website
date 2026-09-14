// The draft can carry one applicant signature plus a visual signature for
// every founder. Keep the body bounded while allowing a practical group of
// signatories to save together.
export const LEGAL_LICENSE_MAX_JSON_BYTES = 32 * 1024 * 1024;
export const LEGAL_LICENSE_TRACK_MAX_JSON_BYTES = 16 * 1024;

function legalLicenseRequestError(code, status) {
  const error = new Error(
    code === "LEGAL_LICENSE_REQUEST_TOO_LARGE"
      ? "Legal-license request body is too large"
      : "Invalid legal-license request body",
  );
  error.code = code;
  error.status = status;
  return error;
}

function invalidRequest() {
  return legalLicenseRequestError("LEGAL_LICENSE_INVALID_REQUEST", 400);
}

function requestTooLarge() {
  return legalLicenseRequestError("LEGAL_LICENSE_REQUEST_TOO_LARGE", 413);
}

export async function readLegalLicenseJson(request, options = {}) {
  const maxBytes = typeof options === "number"
    ? options
    : options?.maxBytes ?? LEGAL_LICENSE_MAX_JSON_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw invalidRequest();

  const rawContentLength = request?.headers?.get?.("content-length");
  if (rawContentLength !== null && rawContentLength !== undefined && rawContentLength !== "") {
    const contentLength = Number(rawContentLength);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) throw invalidRequest();
    if (contentLength > maxBytes) throw requestTooLarge();
  }

  const reader = request?.body?.getReader?.();
  if (!reader) throw invalidRequest();

  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value ?? []);
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw requestTooLarge();
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error?.code) throw error;
    throw invalidRequest();
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw invalidRequest();
    }
    return parsed;
  } catch {
    throw invalidRequest();
  }
}
