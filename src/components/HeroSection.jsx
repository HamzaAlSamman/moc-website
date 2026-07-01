"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { translations } from "../data/translations";
import { useSettings } from "./SettingsContext";

const SOCIALS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/SyrSMOC/",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com/mocsyr",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "Youtube",
    href: "https://www.youtube.com/channel/UC0ewHFtG0rtVCwbohVWvHyA",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

export default function HeroSection({ locale }) {
  const t = translations[locale]?.hero || translations.ar.hero;
  const settings = useSettings();
  const isRtl = locale !== "en";

  // Typewriter phrases list based on the selected locale
  const phrases = useMemo(() => {
    return isRtl
      ? [
          "نحو ثقافةٍ جامعة.. تروي وتبني",
          "نصون عراقة التراث السوري المادي واللامادي",
          "نربط أصالة التاريخ بحداثة المستقبل",
          "منارة إنسانية حضارية متجددة"
        ]
      : [
          "Towards an inclusive culture.. that narrates and builds",
          "Preserving Syrian tangible and intangible heritage",
          "Connecting the authenticity of history with the future",
          "A renewed beacon of human civilization"
        ];
  }, [isRtl]);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(phrases[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset typewriter values if the locale changes
  useEffect(() => {
    setPhraseIndex(0);
    setDisplayedText(phrases[0]);
    setIsDeleting(false);
  }, [locale, phrases]);

  // Main Typewriter typing & deleting engine
  useEffect(() => {
    if (!isMounted) return;

    let timer;
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      // Typing phase
      if (displayedText !== currentPhrase) {
        timer = setTimeout(() => {
          setDisplayedText(currentPhrase.substring(0, displayedText.length + 1));
        }, 75); // Speed of typing
      } else {
        // Phrase is fully typed, pause before deleting starts
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 3000); // 3 seconds pause for reading
      }
    } else {
      // Deleting phase
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(displayedText.substring(0, displayedText.length - 1));
        }, 35); // Faster deleting speed
      } else {
        // Fully deleted, move to the next phrase
        setIsDeleting(false);
        setPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, phraseIndex, isMounted, phrases]);

  return (
    <section
      id="home"
      className="relative min-h-screen pt-12 flex flex-col items-center justify-center overflow-hidden bg-black"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background Panorama Image & Dark Vignette Gradient */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/panorama.jpg"
          alt="Syria Cultural Panorama"
          fill
          priority
          className="object-cover object-bottom animate-subtle-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030705]/95 via-[#030705]/40 to-[#054239]/80" />
      </div>

      {/* Repeating UNESCO Background Pattern */}
      <div className="absolute inset-0 z-[1] opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-[url(/svg/unisco_pattern.svg)] bg-repeat bg-[length:200px]" />
      </div>

      {/* Pulsing Decorative Ambient Glows */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] start-[10%] w-32 h-32 rounded-full bg-gradient-to-br from-[#b9a779]/20 to-transparent blur-xl animate-pulse" />
        <div className="absolute top-[60%] end-[15%] w-48 h-48 rounded-full bg-gradient-to-br from-[#b9a779]/15 to-transparent blur-2xl animate-pulse [animation-delay:1s]" />
        <div className="absolute bottom-[20%] start-[20%] w-24 h-24 rounded-full bg-gradient-to-br from-[#b9a779]/10 to-transparent blur-lg animate-pulse [animation-delay:2s]" />
      </div>

      {/* Styles for Blinking Cursor */}
      <style>{`
        @keyframes typewriter-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .typewriter-cursor {
          animation: typewriter-blink 0.9s infinite;
        }
      `}</style>

      {/* Main Content Area */}
      <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-screen">
        
        {/* Soft radial shadow overlay for text legibility */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[350px] rounded-full bg-[#030705]/60 blur-3xl pointer-events-none z-0" />

        {/* Animated Wrapper */}
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center animate-fade-up">
          {/* Typewriter Quote Block */}
          <div className="w-full min-h-[140px] md:min-h-[160px] lg:min-h-[180px] flex items-center justify-center px-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center leading-relaxed md:leading-snug tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-qomra">
              {displayedText}
              <span className="inline-block w-[3px] h-[0.9em] bg-[#b9a779] ms-2 align-middle typewriter-cursor" />
            </h1>
          </div>

          {/* Gold Ornament Divider */}
          <div className="flex items-center justify-center gap-5 mt-10 w-full">
            <span className="h-[1px] w-24 md:w-36 bg-gradient-to-l rtl:bg-gradient-to-r from-[#b9a779] to-transparent opacity-80" />
            <div className="w-3.5 h-3.5 rotate-45 border-2 border-[#988561] bg-[#b9a779] shadow-md transform hover:rotate-90 transition-transform duration-500" />
            <span className="h-[1px] w-24 md:w-36 bg-gradient-to-r rtl:bg-gradient-to-l from-[#b9a779] to-transparent opacity-80" />
          </div>

          {/* Ministry Signature */}
          <p className="text-center text-[#b9a779] text-sm md:text-base font-semibold mt-6 tracking-widest drop-shadow-md">
            — {t.subtitle} —
          </p>

          {/* Small Subtext / Call to action or dynamic counter */}
          <p className="text-[#EDE5D6]/70 text-xs md:text-sm font-light mt-4 tracking-widest max-w-lg mx-auto drop-shadow-md">
            {isRtl ? "تاريخٌ حيّ، وحضارةٌ تتكلّم" : "Living history, speaking civilization"}
          </p>
        </div>

        {/* Social Media Connectivity Floating Bar */}
        <div className="mt-16 flex flex-col items-center gap-4 z-10 animate-fade-up-delayed">
          <p className="text-[#EDE5D6]/70 text-xs md:text-sm font-medium tracking-widest uppercase drop-shadow-sm">
            {isRtl ? "تابعنا على وسائل التواصل الاجتماعي" : "Follow us on social media"}
          </p>
          
          <div className="flex items-center gap-5">
        {SOCIALS.map((s, idx) => {
          const href = s.label === "Facebook" ? (settings.facebookUrl || s.href) : s.href;
          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-11 h-11 rounded-full bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 hover:bg-[#b9a779]/20 hover:border-[#b9a779]/60 hover:scale-110 cursor-pointer text-white shadow-lg"
              aria-label={s.label}
            >
              {s.icon}
            </a>
          );
        })}
      </div>
        </div>

      </div>
    </section>
  );
}
