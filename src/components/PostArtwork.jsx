"use client";

import { useState } from "react";
import ImageWithFallback from "@/components/ImageWithFallback";

// Below this width/height ratio a source reads as square/portrait
// (Instagram-shaped) rather than a landscape photo.
const PORTRAIT_RATIO_THRESHOLD = 1.2;

/**
 * Same "blurred backdrop + letterboxed foreground" poster frame as
 * EventArtwork, generalized for news posts: a square/portrait
 * (Instagram-shaped) source no longer gets hard-cropped by object-cover,
 * it's shown whole and centered on a blurred, darkened copy of itself.
 * A landscape source just fills the frame with a normal crop — no
 * blurred/green backdrop, since there's no letterboxing to fill in.
 */
export default function PostArtwork({
  src,
  alt,
  sizes,
  preload = false,
  fill = false,
  ratioClassName = "aspect-[16/9]",
  className = "",
  imageClassName = "",
  children,
}) {
  const [isNarrow, setIsNarrow] = useState(false);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target || {};
    if (naturalWidth && naturalHeight) {
      setIsNarrow(naturalWidth / naturalHeight < PORTRAIT_RATIO_THRESHOLD);
    }
  };

  return (
    <div
      className={`${fill ? "absolute inset-0" : `relative ${ratioClassName}`} overflow-hidden bg-[#054239] ${className}`}
    >
      {src && isNarrow ? (
        <div className="absolute inset-0" aria-hidden="true">
          <ImageWithFallback
            src={src}
            alt=""
            sizes={sizes}
            className="scale-110 object-cover blur-xl opacity-60"
          />
          <div className="absolute inset-0 bg-[#054239]/45" />
        </div>
      ) : null}

      <ImageWithFallback
        src={src}
        alt={alt}
        sizes={sizes}
        preload={preload}
        priority={preload}
        className={`z-10 ${isNarrow ? "object-contain" : "object-cover"} ${imageClassName}`}
        onLoad={handleLoad}
      />

      {children}
    </div>
  );
}
