// Client-side image compression/resizing (browser-only — uses Canvas API).
//
// Mobile cameras produce 5–25 MB photos (4000×3000+). Uploading them raw over a
// mobile uplink is painfully slow (minutes to hours on a weak signal). Shrinking
// to a sane max dimension and re-encoding as JPEG on the client cuts the payload
// 30–60× (a 20 MB photo → ~300–600 KB) so the actual upload takes seconds.
//
// Always runs in the browser inside event handlers, never on the server.

const DEFAULT_MAX_DIM = 1920;   // longest edge, px — plenty for a news hero image
const DEFAULT_QUALITY = 0.82;   // JPEG quality — visually lossless for web

// Formats we can safely re-encode. GIFs are skipped (canvas would flatten the
// animation) and non-images (PDF/video) pass through untouched.
const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = objectUrl;
  });
}

/**
 * Compress/resize an image File before upload.
 * Returns a new (smaller) File, or the original file if compression isn't
 * applicable or wouldn't help. Never throws — falls back to the original.
 *
 * @param {File} file
 * @param {{ maxDim?: number, quality?: number }} [opts]
 * @returns {Promise<File>}
 */
export async function compressImage(file, opts = {}) {
  if (!file || typeof window === "undefined") return file;
  if (!COMPRESSIBLE.has(file.type)) return file;

  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return file;

    // Scale down only — never upscale a small image.
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);

    // If it's already small and won't be resized, still re-encode PNGs (often
    // huge for photos), but skip already-small JPEG/WebP to avoid wasted work.
    if (scale === 1 && file.type !== "image/png" && file.size < 1_000_000) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // Bail out if encoding failed or didn't actually shrink the file.
    if (!blob || blob.size >= file.size) return file;

    const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Any decode/encode failure → upload the original, server still validates it.
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
