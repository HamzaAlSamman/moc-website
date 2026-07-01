"use client";

import React, { useEffect, useRef, useState } from "react";

const services = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3" />
        <path d="M12 8v4m0 0v4m0-4h4m-4 0H8" />
      </svg>
    ),
    titleAr: "بوابة التراث الرقمي",
    titleEn: "Digital Heritage Portal",
    descAr: "الوصول إلى المجموعات الأثرية والوثائقية الرقمية والمخطوطات التاريخية النادرة",
    descEn: "Access digital archaeological and documentary collections and rare historical manuscripts",
    gradient: "from-[#ebb962]/10 to-[#002723]/30",
    border: "border-[#ebb962]/20",
    iconRing: "bg-[#ebb962]/10 text-[#ebb962] ring-1 ring-[#ebb962]/30",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M15 10l4.553-2.277A2 2 0 0122 9.618v4.764a2 2 0 01-2.447 1.895L15 15" />
        <rect x="2" y="7" width="13" height="10" rx="2" />
      </svg>
    ),
    titleAr: "تذاكر الفعاليات",
    titleEn: "Event Tickets",
    descAr: "حجز تذاكر المسرح والمعارض والمهرجانات الثقافية في مختلف المحافظات السورية",
    descEn: "Book tickets for theatre, exhibitions and cultural festivals across Syrian provinces",
    gradient: "from-[#428177]/15 to-[#002723]/30",
    border: "border-[#428177]/30",
    iconRing: "bg-[#428177]/10 text-[#428177] ring-1 ring-[#428177]/30",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    titleAr: "منح الدعم الثقافي",
    titleEn: "Cultural Grants",
    descAr: "التقديم على منح الدعم الثقافي للمبدعين والفنانين والباحثين والكتّاب السوريين",
    descEn: "Apply for cultural support grants for Syrian creators, artists, researchers and writers",
    gradient: "from-[#b9a779]/10 to-[#002723]/30",
    border: "border-[#b9a779]/25",
    iconRing: "bg-[#b9a779]/10 text-[#b9a779] ring-1 ring-[#b9a779]/30",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    ),
    titleAr: "التراخيص الثقافية",
    titleEn: "Cultural Licenses",
    descAr: "استخراج وتجديد التراخيص للمؤسسات والنوادي والمراكز والمنظمات الثقافية",
    descEn: "Issue and renew licenses for cultural institutions, clubs, centers and organizations",
    gradient: "from-[#ebb962]/10 to-[#002723]/30",
    border: "border-[#ebb962]/20",
    iconRing: "bg-[#ebb962]/10 text-[#ebb962] ring-1 ring-[#ebb962]/30",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
    titleAr: "المنح الدراسية",
    titleEn: "Cultural Scholarships",
    descAr: "فرص المنح الدراسية في الفنون والآثار والتراث والأدب المقارن للشباب السوري",
    descEn: "Scholarship opportunities in arts, archaeology, heritage and comparative literature",
    gradient: "from-[#428177]/15 to-[#002723]/30",
    border: "border-[#428177]/30",
    iconRing: "bg-[#428177]/10 text-[#428177] ring-1 ring-[#428177]/30",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    titleAr: "الشراكات الدولية",
    titleEn: "International Partnerships",
    descAr: "التواصل مع الشركاء والمنظمات الدولية والمشاركة في برامج التعاون الثقافي",
    descEn: "Connect with international partners and participate in cultural cooperation programs",
    gradient: "from-[#b9a779]/10 to-[#002723]/30",
    border: "border-[#b9a779]/25",
    iconRing: "bg-[#b9a779]/10 text-[#b9a779] ring-1 ring-[#b9a779]/30",
  },
];

export default function ServicesSection({ locale }) {
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = useRef(null);
  const isRtl = locale !== "en";

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setSectionVisible(true); },
      { threshold: 0.08 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative py-20 md:py-28 bg-[#002723] overflow-hidden scroll-mt-28"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "120px", backgroundRepeat: "repeat" }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute top-20 end-0 w-96 h-96 bg-[#428177]/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 start-0 w-80 h-80 bg-[#A48E68]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 md:px-8 relative z-10">

        {/* Header */}
        <div className={`text-center mb-14 ${sectionVisible ? "section-reveal" : "opacity-0"}`}>
          <span className="inline-flex items-center gap-2 text-[#ebb962] text-xs font-bold tracking-[0.2em] uppercase mb-5 border border-[#ebb962]/25 rounded-full px-5 py-1.5 bg-[#ebb962]/5">
            <span className="w-2 h-2 rounded-full bg-[#ebb962] pulse-dot" />
            {isRtl ? "قريبًا" : "Coming Soon"}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight font-sans">
            {isRtl ? "الخدمات الإلكترونية" : "Digital Services"}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#A48E68]" />
            <div className="w-2 h-2 rotate-45 bg-[#ebb962] shrink-0" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#A48E68]" />
          </div>
          <p className="text-gray-300 mt-4 max-w-xl mx-auto text-sm leading-relaxed font-medium">
            {isRtl
              ? "نعمل على إطلاق منظومة خدمات إلكترونية متكاملة لتيسير وصولكم إلى خدمات الوزارة الثقافية"
              : "We're building a comprehensive digital services platform to facilitate access to Ministry cultural services"}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, idx) => (
            <div
              key={idx}
              className={`group relative bg-gradient-to-br ${service.gradient} border ${service.border} rounded-2xl p-6 overflow-hidden hover:border-[#ebb962]/40 hover:shadow-2xl hover:shadow-[#030705]/50 transition-all duration-300 cursor-default ${
                sectionVisible ? "card-reveal" : "opacity-0"
              }`}
              style={{ "--anim-delay": `${200 + idx * 90}ms` }}
            >
              {/* Coming Soon Badge */}
              <div className="absolute top-4 end-4">
                <span className="bg-[#ebb962]/10 text-[#ebb962] border border-[#ebb962]/20 text-[11px] font-bold px-2.5 py-1 rounded-full">
                  {isRtl ? "قريبًا" : "Soon"}
                </span>
              </div>

              {/* Icon */}
              <div className={`w-13 h-13 rounded-xl ${service.iconRing} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105`}
                   style={{ width: "3.25rem", height: "3.25rem" }}>
                {service.icon}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-base mb-2.5 pe-10 font-sans">
                {isRtl ? service.titleAr : service.titleEn}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                {isRtl ? service.descAr : service.descEn}
              </p>

              {/* Hover inner glow */}
              <div className="absolute inset-0 rounded-2xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Notify CTA */}
        <div
          className={`mt-14 text-center ${sectionVisible ? "card-reveal" : "opacity-0"}`}
          style={{ "--anim-delay": "800ms" }}
        >
          <p className="text-gray-400 mb-5 text-sm font-semibold">
            {isRtl
              ? "هل تريد أن تكون من أوائل المطّلعين على إطلاق الخدمات؟"
              : "Want to be among the first to know when services launch?"}
          </p>
          <a
            href={`mailto:info@moc.gov.sy?subject=${encodeURIComponent(isRtl ? "اشتراك في أخبار الخدمات الإلكترونية" : "Subscribe to Digital Services News")}`}
            className="inline-flex items-center gap-3 border-2 border-[#ebb962]/40 hover:border-[#ebb962] text-[#ebb962] font-bold px-8 py-3.5 rounded-full transition-all duration-300 hover:bg-[#ebb962]/10 active:scale-95 shadow-md hover:shadow-gold-glow-hover"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: "1.1rem", height: "1.1rem" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {isRtl ? "أبلغني عند الإطلاق" : "Notify Me at Launch"}
          </a>
        </div>

      </div>
    </section>
  );
}
