export const CLIENT_IMAGE_MAX_EDGE = 2000;
export const CLIENT_IMAGE_QUALITY = 0.82;

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function shouldCompressImage(file) {
  return COMPRESSIBLE_IMAGE_TYPES.has(file?.type);
}

function getTargetSize(width, height, maxEdge) {
  const largest = Math.max(width, height);
  if (!largest || largest <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / largest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be loaded"));
    };

    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Image could not be compressed"));
      },
      type,
      quality,
    );
  });
}

export async function compressImageForUpload(file, options = {}) {
  if (!shouldCompressImage(file) || typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  try {
    const maxEdge = options.maxEdge ?? CLIENT_IMAGE_MAX_EDGE;
    const quality = options.quality ?? CLIENT_IMAGE_QUALITY;
    const img = await loadImage(file);
    const target = getTargetSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!target.width || !target.height || !ctx) return file;

    canvas.width = target.width;
    canvas.height = target.height;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.drawImage(img, 0, 0, target.width, target.height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    return file;
  }
}
