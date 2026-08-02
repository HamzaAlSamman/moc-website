"use client";

import React from "react";
import Image from "next/image";

export default function SubpageHero({
  title,
  subtitle,
  description,
  bgImage = "/images/drive-photos/Khan-Asad-Basha.jpg",
  bgImageAlt = "وزارة الثقافة السورية",
  hasPattern = true,
  hasGlow = true,
  children
}) {
  return (
    <section className="relative min-h-[280px] sm:min-h-[320px] lg:min-h-[350px] xl:min-h-[360px] flex items-center justify-center py-10 sm:py-12 px-4 overflow-hidden border-b border-[#b9a779]/15 z-10">
      {/* Background Image & Vignette */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt={bgImageAlt}
          fill
          priority
          className="object-cover brightness-[0.22] saturate-[0.8] object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#002723]/90 via-[#002723]/75 to-[#002723] z-0" />
        
        {/* UNESCO pattern overlay */}
        {hasPattern && (
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "url(/svg/unisco_pattern.svg)",
              backgroundSize: "90px",
              backgroundRepeat: "repeat",
            }}
          />
        )}
      </div>

      {/* Ambient Glow Orb */}
      {hasGlow && (
        <div className="absolute top-1/2 -translate-y-1/2 left-1/4 w-80 h-80 bg-[#b9a779]/10 rounded-full blur-[120px] pointer-events-none z-10" />
      )}

      {/* Centered Content */}
      <div className="max-w-5xl w-full mx-auto text-center relative z-10 flex flex-col items-center gap-4">
        {/* Subtitle Badge */}
        {subtitle && (
          <span className="text-[10px] uppercase text-[#b9a779] font-bold tracking-widest border border-[#b9a779]/30 rounded-full px-4 py-1.5 bg-[#b9a779]/5 leading-none">
            {subtitle}
          </span>
        )}

        {/* Title */}
        {title && (
          <h1 className="text-white font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight font-qomra">
            {title}
          </h1>
        )}

        {/* Golden Divider */}
        <div className="w-16 h-[2.5px] bg-[#b9a779] shrink-0" />

        {/* Optional Description */}
        {description && (
          <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
            {description}
          </p>
        )}

        {/* Optional Children */}
        {children && <div className="w-full flex flex-col items-center">{children}</div>}
      </div>
    </section>
  );
}
