"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function QuickNavSection({ locale }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  const isRtl = locale !== "en";

  useEffect(() => {
    setVisible(true);
  }, []);

  const items = [
    {
      href: "#achievements",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      labelAr: "الإنجازات الشهرية",
      labelEn: "Monthly Achievements",
      subAr: "محدَّث شهريًا",
      subEn: "Updated monthly",
      accent: "#ebb962",
      bg: "bg-white hover:bg-slate-50",
      border: "border-slate-100",
      iconBg: "bg-amber-50 text-[#ebb962]",
    },
    {
      href: "#calendar",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      ),
      labelAr: "الروزنامة الثقافية",
      labelEn: "Cultural Calendar",
      subAr: "فعاليات قادمة",
      subEn: "Upcoming events",
      accent: "#428177",
      bg: "bg-white hover:bg-slate-50",
      border: "border-slate-100",
      iconBg: "bg-teal-50 text-[#428177]",
    },
    {
      href: "#services",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
      labelAr: "الخدمات الإلكترونية",
      labelEn: "Digital Services",
      subAr: "قريبًا",
      subEn: "Coming soon",
      accent: "#b9a779",
      bg: "bg-white hover:bg-slate-50",
      border: "border-slate-100",
      iconBg: "bg-yellow-50 text-[#b9a779]",
    },
    {
      href: `/${locale}/news`,
      isLink: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a4 4 0 01-4-4V6" />
          <path d="M10 9h8M10 13h8M10 17h4" />
        </svg>
      ),
      labelAr: "آخر الأخبار",
      labelEn: "Latest News",
      subAr: "أخبار وتحديثات",
      subEn: "News & updates",
      accent: "#002723",
      bg: "bg-white hover:bg-slate-50",
      border: "border-slate-100",
      iconBg: "bg-slate-100 text-[#002723]",
    },
  ];

  return (
    <div
      ref={ref}
      className="relative bg-[#F9F9F9] border-y border-slate-100 py-8 md:py-10"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
          {items.map((item, idx) => {
            const content = (
              <div
                className={`group relative flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-5 rounded-2xl ${item.bg} border ${item.border}
                  hover:border-primary/30 hover:shadow-md
                  transition-all duration-300 cursor-pointer overflow-hidden
                  ${visible ? "card-reveal" : "opacity-0"}`}
                style={{ "--anim-delay": `${idx * 80}ms` }}
              >
                {/* Icon */}
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0
                  transition-transform duration-300 group-hover:scale-110`}>
                  {item.icon}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1 text-start">
                  <div className="text-foreground font-bold text-xs sm:text-sm leading-tight line-clamp-2">
                    {isRtl ? item.labelAr : item.labelEn}
                  </div>
                  <div className="text-slate-450 text-[10px] sm:text-xs mt-0.5 font-medium hidden sm:block">
                    {isRtl ? item.subAr : item.subEn}
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 opacity-30 group-hover:opacity-75 transition-all duration-300 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 text-slate-650"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>

                {/* Bottom accent line on hover */}
                <div
                  className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)` }}
                />
              </div>
            );

            return item.isLink ? (
              <Link key={idx} href={item.href} className="block">{content}</Link>
            ) : (
              <a key={idx} href={item.href} className="block">{content}</a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
