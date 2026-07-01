"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { translations } from "../data/translations";

export default function MapSection({ locale }) {
  const t = translations[locale]?.map || translations.ar.map;
  const isRtl = locale !== "en";
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const timer = setTimeout(() => setLoaded(true), 150);
    return () => clearTimeout(timer);
  }, [locale]);

  return (
    <section
      className="py-8 mt-0 min-h-[400px] bg-[#F9F9F9] w-full overflow-hidden bg-top bg-no-repeat bg-[url(/images/map-frame.svg)] bg-[length:200%_auto] sm:bg-[length:150%_auto] md:bg-[length:120%_auto] relative flex items-center"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="container mx-auto px-6 md:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Map Image (Visual Left side for RTL/LTR) */}
          <div
            className={`w-full flex justify-center items-center transition-all duration-[800ms] ${
              loaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <div className="relative w-full max-w-[800px] aspect-[800/350] min-h-[220px] md:min-h-[260px]">
              <Image
                alt="Syria Archaeological Map"
                src="/images/map.svg"
                width={800}
                height={350}
                priority
                className="object-contain"
              />
            </div>
          </div>

          {/* Texts (Right side for RTL / Left side for LTR) */}
          <div
            className={`flex flex-col gap-4 text-start transition-all duration-[800ms] ${
              loaded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <h3 
              className="text-xl md:text-3xl font-semibold leading-normal text-foreground max-w-2xl"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <span className="text-primary">{t.title}</span>
              {" "}
              {t.titleSecondary}
              {" "}
              <span className="text-secondary">{t.titleTertiary}</span>
            </h3>
            
            <p 
              className="text-lg font-normal mt-6 leading-relaxed text-[#171717]/85"
              dir={isRtl ? "rtl" : "ltr"}
            >
              {t.text}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
