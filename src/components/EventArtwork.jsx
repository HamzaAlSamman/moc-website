"use client";

import ImageWithFallback from "@/components/ImageWithFallback";

export default function EventArtwork({
  src,
  alt,
  sizes,
  preload = false,
  className = "",
  imageClassName = "",
}) {
  return (
    <div className={`relative aspect-[4/5] overflow-hidden bg-[#002723] ${className}`}>
      {src ? (
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
        className={`z-10 object-contain ${imageClassName}`}
      />
    </div>
  );
}
