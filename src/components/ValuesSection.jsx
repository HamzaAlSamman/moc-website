"use client";

import React, { useEffect, useRef, useState } from "react";
import { translations } from "../data/translations";

export default function ValuesSection({ locale }) {
  const t = translations[locale]?.values || translations.ar.values;
  const isRtl = locale !== "en";
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    setSectionVisible(true);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full overflow-hidden bg-white py-12 md:py-20"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-16 relative z-10">

        {/* Title */}
        <h2 className="text-xl md:text-2xl font-bold text-center mb-12 text-[#3D3D3D]">
          {t.title}
        </h2>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {t.cards.map((card, index) => {
            const numStr = index + 1 < 10 ? `0${index + 1}.` : `${index + 1}.`;
            const imagePath = `/images/${card.image || `cultural-principle${index + 1}.jpg`}`;

            return (
              <div
                key={index}
                className="flex transition-all duration-500"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="group relative w-full flex flex-col p-8 bg-[#F4F6F5] rounded-2xl border border-white shadow-sm overflow-hidden transition-all duration-500 min-h-[360px]">
                  
                  {/* Background Image Reveal on Hover */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
                    style={{ backgroundImage: `url('${imagePath}')` }}
                  ></div>
                  
                  {/* Deep Teal Overlay on Hover */}
                  <div className="absolute inset-0 bg-[#143D49DE] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  
                  {/* Number Badge */}
                  <div 
                    id="cultural-number" 
                    className="z-10 absolute top-0 left-5 m-0 py-2 px-2 rounded-b-md bg-[#3D3D3D] text-white text-sm font-semibold group-hover:bg-[#428177] group-hover:text-white transition-colors duration-500"
                  >
                    {numStr}
                  </div>
                  
                  {/* Text Contents */}
                  <div className="relative flex-1 z-10 mt-12 mb-16 lg:text-start text-start">
                    <h3 
                      id="cultural-title" 
                      className="text-2xl font-bold text-[#3D3D3D] mb-4 group-hover:text-[#B9A779] transition-colors duration-500"
                    >
                      {card.title}
                    </h3>
                    <p 
                      id="cultural-description" 
                      className="text-start text-[#6B6B6B] leading-relaxed text-lg md:text-md font-medium group-hover:text-white transition-colors duration-500"
                    >
                      {card.desc}
                    </p>
                  </div>
                  
                  {/* Bottom Elements */}
                  <div className="relative z-10 flex items-center justify-between mt-auto w-full">
                    {/* Double Arrow Button */}
                    <div 
                      id="cultural-arrow" 
                      className="p-2 bg-[#3D3D3D] text-white rounded-md transition-colors duration-500 group-hover:bg-[#428177] shrink-0 cursor-pointer"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="tabler-icon tabler-icon-arrow-forward-up-double"
                      >
                        <path d="M11 14l4 -4l-4 -4"></path>
                        <path d="M16 14l4 -4l-4 -4"></path>
                        <path d="M15 10h-7a4 4 0 1 0 0 8h1"></path>
                      </svg>
                    </div>
                    
                    {/* Eagle Watermark Mask */}
                    <div 
                      id="cultural-egle" 
                      className="w-12 h-12 bg-[#988561] group-hover:bg-[#EDEBE0] transition-colors duration-500 shrink-0" 
                      style={{ 
                        maskImage: "url('/svg/egle.svg')",
                        maskRepeat: "no-repeat",
                        maskSize: "contain",
                        maskPosition: "center",
                        WebkitMaskImage: "url('/svg/egle.svg')",
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskSize: "contain",
                        WebkitMaskPosition: "center"
                      }}
                    ></div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
