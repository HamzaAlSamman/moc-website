export const COPYRIGHT_MAX_REQUEST_BYTES = 160 * 1024 * 1024;

function requestError(status) {
  const error = new Error(status === 413
    ? "حجم ملفات الطلب يتجاوز الحد المسموح؛ استخدم رابط Google Drive لملف العمل الكبير"
    : "تعذر قراءة بيانات الطلب؛ أعد اختيار الملفات وحاول مرة أخرى");
  error.code = status === 413 ? "COPYRIGHT_REQUEST_TOO_LARGE" : "COPYRIGHT_INVALID_REQUEST";
  error.status = status;
  return error;
}

export async function readCopyrightJson(request, { maxBytes = COPYRIGHT_MAX_REQUEST_BYTES } = {}) {
  const declared = request.headers.get("content-length");
  if (declared !== null && declared !== "") {
    const size = Number(declared);
    if (!Number.isSafeInteger(size) || size < 0) throw requestError(400);
    if (size > maxBytes) throw requestError(413);
  }
  if (!request.body) throw requestError(400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw requestError(413);
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    const parsed = JSON.parse(parts.join(""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw requestError(400);
    return parsed;
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error.code === "COPYRIGHT_REQUEST_TOO_LARGE") throw error;
    throw requestError(400);
  } finally { reader.releaseLock(); }
}
