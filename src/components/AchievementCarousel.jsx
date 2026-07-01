"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

/**
 * Instagram-style 1:1 carousel for achievement media (images + videos).
 *
 * Props:
 *  - items: Array<{ url: string, type: "image"|"video" }>
 *  - fallbackImage: string (backward compat when gallery is empty)
 *  - alt: string
 *  - sizes: string (Next.js Image sizes hint)
 *  - overlay: ReactNode (content rendered on top of the carousel)
 */
export default function AchievementCarousel({
  items = [],
  fallbackImage,
  alt = "",
  sizes = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw",
  overlay,
  isRtl = true,
  aspectRatio = "4/5",
}) {
  const [current, setCurrent] = useState(0);
  const scrollContainerRef = useRef(null);

  // Reset to 0 when items change
  useEffect(() => { setCurrent(0); }, [items.length]);

  // If gallery is empty, show fallback single image
  const slides = items.length > 0 ? items : (fallbackImage ? [{ url: fallbackImage, type: "image" }] : []);
  const total = slides.length;

  const goTo = useCallback((idx) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetIndex = Math.max(0, Math.min(idx, total - 1));
    
    const children = container.children;
    if (children && children[targetIndex]) {
      children[targetIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
      setCurrent(targetIndex);
    }
  }, [total]);

  // ── Scroll event to update indicator ──
  const handleScroll = (e) => {
    const container = e.currentTarget;
    const width = container.offsetWidth;
    if (width <= 0) return;
    const scrollLeft = Math.abs(container.scrollLeft);
    const index = Math.round(scrollLeft / width);
    if (index !== current && index >= 0 && index < total) {
      setCurrent(index);
    }
  };

  // ── Auto-play and control videos ──
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    setIsPlaying(true);
  }, [current]);

  const togglePlay = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const activeSlide = container.children[current];
    const vid = activeSlide?.querySelector("video");
    if (!vid) return;
    
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      vid.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const videos = container.querySelectorAll("video");
    videos.forEach((vid) => {
      const slideElement = vid.closest(".snap-start");
      const slideIdx = Array.from(container.children).indexOf(slideElement);
      
      if (slideIdx === current) {
        if (isPlaying) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      } else {
        vid.pause();
        vid.currentTime = 0;
      }
    });
  }, [current, isPlaying]);

  if (total === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: aspectRatio }}
    >
      {/* Video indicator badge */}
      {slides[current]?.type === "video" && (
        <div className="absolute top-3 end-3 z-20 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5 drop-shadow-md opacity-90">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </div>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full flex overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
        onScroll={handleScroll}
      >
        {slides.map((s, idx) => (
          <div
            key={idx}
            className="w-full h-full flex-shrink-0 snap-start snap-always relative"
          >
            {s.type === "video" ? (
              <div className="relative w-full h-full cursor-pointer" onClick={togglePlay}>
                <video
                  src={s.url}
                  muted={isMuted}
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Pause overlay icon flash */}
                {idx === current && !isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20 pointer-events-none transition-all duration-300">
                    <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center text-white scale-100 animate-ping absolute opacity-30" />
                    <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center text-white relative z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-7 h-7 text-white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Image
                src={s.url}
                alt={alt}
                fill
                sizes={sizes}
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {/* Overlay content (text, tags, etc.) */}
      {overlay}

      {/* Navigation arrows (desktop/mobile) — only show if multi-slide */}
      {total > 1 && (
        <>
          {/* Left Arrow Button */}
          {((isRtl && current < total - 1) || (!isRtl && current > 0)) && (
            <button
              onClick={(e) => { e.stopPropagation(); goTo(isRtl ? current + 1 : current - 1); }}
              className="absolute top-1/2 left-2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-md border border-white/60 text-gray-800 flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white transition-all duration-200 z-20 shadow-md cursor-pointer"
              aria-label={isRtl ? "التالي" : "Previous"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {/* Right Arrow Button */}
          {((isRtl && current > 0) || (!isRtl && current < total - 1)) && (
            <button
              onClick={(e) => { e.stopPropagation(); goTo(isRtl ? current - 1 : current + 1); }}
              className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-md border border-white/60 text-gray-800 flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white transition-all duration-200 z-20 shadow-md cursor-pointer"
              aria-label={isRtl ? "السابق" : "Next"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Mute/Unmute button in corner */}
      {slides[current]?.type === "video" && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
          className="absolute bottom-3 end-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition text-xs z-30 pointer-events-auto cursor-pointer"
          aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A1.5 1.5 0 003 9v6a1.5 1.5 0 001.5 1.5h2l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A1.5 1.5 0 003 9v6a1.5 1.5 0 001.5 1.5h2l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zm4.82 2.63a.75.75 0 011.06-.08 10.487 10.487 0 010 10.78a.75.75 0 11-1.28-.78 8.987 8.987 0 000-9.22a.75.75 0 000 9.22a.75.75 0 01.22-.7z" />
              <path d="M21.3 8.35a.75.75 0 011.02-.37a13.987 13.987 0 010 8.04a.75.75 0 11-1.39-.56a12.487 12.487 0 000-6.92a.75.75 0 01.37-1.19z" />
            </svg>
          )}
        </button>
      )}

      {/* Dots indicator */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              className={`rounded-full transition-all duration-200 ${
                i === current
                  ? "w-2 h-2 bg-white shadow-md"
                  : "w-1.5 h-1.5 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

    </div>
  );
}
