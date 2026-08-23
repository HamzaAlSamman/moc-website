"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

/**
 * Renders an image with graceful degradation:
 *   1. optimized  → Next.js <Image> (resized/webp, fast)
 *   2. raw        → if optimization fails (e.g. the server image optimizer is
 *                   unavailable, a common Plesk/PM2 issue), serve the original
 *                   file directly so the real picture still shows
 *   3. fallback   → only if the file is genuinely missing/broken, show a
 *                   branded gradient placeholder (no network request)
 *
 * Use with a positioned parent + `fill`.
 */
export default function ImageWithFallback({
  src,
  alt = "",
  fill = true,
  className = "",
  fallbackClassName = "",
  sizes,
  preload = false,
  priority = false,
  ...rest
}) {
  // stages: "optimized" -> "raw" -> "failed"
  const [stage, setStage] = useState(src ? "optimized" : "failed");

  // Reset when the source changes (component instances are reused in lists).
  useEffect(() => {
    setStage(src ? "optimized" : "failed");
  }, [src]);

  if (!src || stage === "failed") {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#002723] via-[#0D443C] to-[#1C665A] ${fallbackClassName}`}
        role="img"
        aria-label={alt}
      >
        {/* Subtle heritage pattern */}
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "90px", backgroundRepeat: "repeat" }}
        />
        {/* Ministry eagle emblem */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/svg/egle.svg"
          alt=""
          className="opacity-50 w-[40%] max-w-[72px] h-auto relative z-10"
        />
      </div>
    );
  }

  // Optimizer failed once — serve the original file directly (no optimization).
  if (stage === "raw") {
    /* eslint-disable-next-line @next/next/no-img-element */
    return (
      <img
        src={src}
        alt={alt}
        loading={preload || priority ? "eager" : "lazy"}
        className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
        onError={() => setStage("failed")}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      preload={preload}
      priority={priority}
      className={className}
      onError={() => setStage("raw")}
      {...rest}
    />
  );
}
