"use client";

import ImageWithFallback from "@/components/ImageWithFallback";

/**
 * Same "blurred backdrop + letterboxed foreground" poster frame as
 * EventArtwork, generalized for news posts: a square/portrait
 * (Instagram-shaped) source no longer gets hard-cropped by object-cover,
 * it's shown whole and centered on a blurred, darkened copy of itself.
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
  return (
    <div
      className={`${fill ? "absolute inset-0" : `relative ${ratioClassName}`} overflow-hidden bg-[#054239] ${className}`}
    >
      {src ? (
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
        className={`z-10 object-contain ${imageClassName}`}
      />

      {children}
    </div>
  );
}
