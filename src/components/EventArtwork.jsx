"use client";

import { useState } from "react";
import ImageWithFallback from "@/components/ImageWithFallback";

// Below this width/height ratio a source reads as square/portrait
// (Instagram-shaped) rather than a landscape photo.
const PORTRAIT_RATIO_THRESHOLD = 1.2;

export default function EventArtwork({
  src,
  alt,
  sizes,
  preload = false,
  className = "",
  imageClassName = "",
}) {
  const [isNarrow, setIsNarrow] = useState(false);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target || {};
    if (naturalWidth && naturalHeight) {
      setIsNarrow(naturalWidth / naturalHeight < PORTRAIT_RATIO_THRESHOLD);
    }
  };

  return (
    <div className={`relative aspect-[4/5] overflow-hidden bg-[#002723] ${className}`}>
      {src && isNarrow ? (
        <div className="absolute inset-0" aria-hidden="true">
          <ImageWithFallback
            src={src}
            alt=""
            sizes={sizes}
            className="scale-110 object-cover blur-xl opacity-60"
          />
          <div className="absolute inset-0 bg-[#002723]/45" />
        </div>
      ) : null}

      <ImageWithFallback
        src={src}
        alt={alt}
        sizes={sizes}
        preload={preload}
        className={`z-10 ${isNarrow ? "object-contain" : "object-cover"} ${imageClassName}`}
        onLoad={handleLoad}
      />
    </div>
  );
}
