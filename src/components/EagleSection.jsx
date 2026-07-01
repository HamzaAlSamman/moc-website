"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { translations } from "../data/translations";

export default function EagleSection({ locale }) {
  const t = translations[locale]?.eagle || translations.ar.eagle;
  const isRtl = locale !== "en";
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <section 
      className="relative w-full isolate min-h-[550px] md:min-h-[700px] lg:min-h-[800px] overflow-hidden bg-[#2B3130]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background Section Image with Dark Green/Teal Gradient Backdrop */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/aleppo.jpg"
          alt="Heritage Background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2B3130]/90 via-[#2B3130]/80 to-[#428177]/80" />
      </div>

      {/* Repeating UNESCO Pattern Overlays */}
      <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay pointer-events-none">
        <div className="absolute inset-0 bg-[url(/svg/unisco_pattern.svg)] bg-repeat" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 container mx-auto px-6 md:px-16 py-16 md:py-24">
        
        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-white text-4xl md:text-5xl font-bold mb-4 tracking-wide">
            {t.title}
          </h2>
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className="h-0.5 w-20 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[#A48E68]"></span>
            <div className="w-3 h-3 rotate-45 bg-[#A48E68] shrink-0"></div>
            <span className="h-0.5 w-20 bg-gradient-to-l rtl:bg-gradient-to-r from-transparent to-[#A48E68]"></span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start mt-8 md:mt-16">
          
          {/* Column 1: Eagle Images & Floating Artifact */}
          <div className="relative h-full">
            
            {/* Golden Eagle Large Card */}
            <div className="relative h-[320px] sm:h-[420px] lg:h-[700px] rounded-2xl overflow-hidden group">
              <Image
                src="/images/syrian-golden-eagle.png"
                alt="العقاب الذهبي السوري"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white text-start">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-0.5 bg-[#A48E68]"></div>
                  <span className="text-[#A48E68] text-sm font-semibold tracking-widest">
                    {t.sub}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {t.name}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {t.desc}
                </p>
              </div>
            </div>

            {/* Tilted Basalt Artifact Card (bottom-right on RTL, bottom-left on LTR) */}
            <div className={`absolute -bottom-8 ${isRtl ? "right-4" : "left-4"} hidden lg:block z-10`}>
              <div 
                className="relative w-56 h-56 rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 rotate-6 hover:rotate-0 transition-transform duration-500 bg-[#002723]"
              >
                <Image
                  src="/images/ancient-eagle-artifact.png"
                  alt="قطعة أثرية - تل الجرف الأحمر"
                  fill
                  sizes="224px"
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 text-start">
                  <p className="text-white text-xs font-semibold">{t.artifactDate}</p>
                  <p className="text-white/77 text-[10px]">{t.artifactSubtitle}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2: Historical Timeline & Symbolism */}
          <div className="space-y-8">
            
            {/* Timeline Header */}
            <div className="text-start">
              <h3 className={`text-white text-2xl font-bold mb-6 flex items-center gap-3 ${isRtl ? "justify-start" : "justify-start"}`}>
                <span>{t.timelineTitle}</span>
                <div className="w-8 h-8 rounded-full bg-[#A48E68]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#A48E68] text-sm leading-none">⏳</span>
                </div>
              </h3>
            </div>

            {/* Timeline List */}
            <div className="flex flex-col gap-6 w-full">
              {t.timeline.map((item, index) => (
                <div 
                  key={index} 
                  className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 hover:border-[#A48E68]/50 hover:shadow-lg hover:shadow-[#A48E68]/10 w-full"
                  tabIndex="0"
                >
                  {/* Timeline connector line between items */}
                  {index < t.timeline.length - 1 && (
                    <div className={`absolute -bottom-4 ${isRtl ? "right-12" : "left-12"} w-0.5 h-4 bg-gradient-to-b from-[#A48E68]/50 to-transparent pointer-events-none`}></div>
                  )}
                  
                  <div className="flex items-start gap-4 text-start">
                    <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#A48E68] to-[#8B7355] flex items-center justify-center text-xl sm:text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 select-none">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[#A48E68] text-xs font-semibold px-3 py-1 bg-[#A48E68]/10 rounded-full shrink-0">
                          {item.date}
                        </span>
                        <h4 className="text-white font-bold text-base sm:text-lg">
                          {item.title}
                        </h4>
                      </div>
                      
                      <p className="text-sm text-[#B9A779] font-semibold mb-2 text-start">
                        {item.subtitle}
                      </p>
                      <p className="text-white/70 text-sm leading-relaxed text-start">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* Contemporary Callout Banner */}
            <div className={`relative bg-white/5 border-y border-[#A48E68]/20 rounded-lg p-6 mt-8 text-start ${
              isRtl ? "border-r-4 border-r-[#A48E68]" : "border-l-4 border-l-[#A48E68]"
            }`}>
              <p className="text-white text-lg font-semibold leading-relaxed">
                {t.callout}
              </p>
              <div className="mt-4">
                <span className="text-[#d7bc8f] text-2xl font-bold">
                  {t.calloutSub}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
      
      {/* Bottom Separator line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#A48E68] to-transparent opacity-30"></div>
    </section>
  );
}
