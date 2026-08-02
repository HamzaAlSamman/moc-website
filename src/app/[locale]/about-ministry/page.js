"use client";

import React, { use } from "react";
import Image from "next/image";
import { translations } from "../../../data/translations";
import ScrollReveal from "../../../components/ScrollReveal";
import DecorativeCorners from "../../../components/DecorativeCorners";
import SubpageHero from "../../../components/SubpageHero";

export default function AboutMinistryPage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";
  const t = translations[locale]?.aboutMinistryPage || translations.ar.aboutMinistryPage;
  const common = translations[locale]?.common || translations.ar.common;
  const isRtl = locale === "ar";

  // List of values keys
  const valuesKeys = ["knowledge", "justice", "participation", "empowerment"];

  // List of directorates keys and items dynamically extracted from translations
  const directorateKeys = t?.organizationalStructure?.directorates?.items
    ? Object.keys(t.organizationalStructure.directorates.items)
    : [];

  // List of affiliated entities keys and items dynamically extracted from translations
  const affiliatedKeys = t?.organizationalStructure?.affiliatedEntities?.items
    ? Object.keys(t.organizationalStructure.affiliatedEntities.items)
    : [];

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FBF9F6] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
      {/* 1. Hero Header Banner */}
      <SubpageHero
        title={t.hero.title}
        subtitle={isRtl ? "وزارة الثقافة السورية" : "Syrian Ministry of Culture"}
        description={t.hero.description}
        isRtl={isRtl}
      />

      {/* 2. Who We Are Section (من نحن) */}
      <section id="who-we-are" className="relative py-20 lg:py-32 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8f9fa] via-white to-[#f0f4f3] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#428177]/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#B9A779]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Block */}
          <ScrollReveal type="up" className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-4">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[#B9A779]"></div>
              <span className="text-[#428177] font-bold text-xs md:text-sm tracking-wider uppercase">
                {t.whoWeAre.subtitle}
              </span>
              <div className="h-px w-16 md:w-24 bg-gradient-to-l rtl:bg-gradient-to-r from-transparent to-[#B9A779]"></div>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#2B3130] font-sans">
              {t.whoWeAre.title}
            </h2>
          </ScrollReveal>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Column 1: Image & Founding Badge */}
            <ScrollReveal type="left" className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
                <Image
                  src="/images/about-hero-image.png"
                  width={600}
                  height={500}
                  alt={t.whoWeAre.imageAlt}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B3130]/30 to-transparent"></div>
              </div>

              {/* Year Badge */}
              <div className={`absolute -bottom-4 sm:-bottom-6 ${isRtl ? "-right-2 sm:-right-6 lg:-right-8" : "-left-2 sm:-left-6 lg:-left-8"} bg-gradient-to-br from-[#428177] to-[#002723] text-white p-5 rounded-2xl shadow-2xl border border-[#B9A779]/20 z-10`}>
                <div className="text-center">
                  <span className="block text-3xl md:text-4xl font-extrabold font-sans mb-0.5 tracking-tight text-[#B9A779]">
                    1958
                  </span>
                  <span className="text-[10px] md:text-xs uppercase font-bold tracking-wider opacity-85">
                    {t.whoWeAre.since}
                  </span>
                </div>
              </div>

              {/* Backglow border decoration */}
              <div className={`absolute -z-10 -top-2 sm:-top-4 ${isRtl ? "-right-2 sm:-right-4" : "-left-2 sm:-left-4"} w-full h-full rounded-2xl bg-gradient-to-br from-[#B9A779]/20 to-[#428177]/20`}></div>
            </ScrollReveal>

            {/* Column 2: Establishment paragraphs & values grid */}
            <ScrollReveal type="right" className="lg:col-span-7 space-y-8">
              {/* Paragraphs */}
              <div className="space-y-6">
                <div className="relative pr-6 rtl:pr-6 ltr:pl-6 ltr:pr-0 text-start">
                  <div className={`absolute top-0 ${isRtl ? "right-0" : "left-0"} w-1 h-full bg-gradient-to-b from-[#428177] to-[#B9A779] rounded-full`}></div>
                  <p className="text-base sm:text-lg leading-relaxed text-slate-700 font-medium">
                    {t.whoWeAre.establishment}
                  </p>
                </div>

                <div className="bg-gradient-to-l from-[#428177]/5 to-transparent rounded-xl p-5 border-r-2 border-[#428177]/30 text-start">
                  <p className="text-base sm:text-lg leading-relaxed text-slate-700 font-medium">
                    {t.whoWeAre.postLiberation}
                  </p>
                </div>

                <div className="relative pr-6 rtl:pr-6 ltr:pl-6 ltr:pr-0 text-start">
                  <div className={`absolute top-0 ${isRtl ? "right-0" : "left-0"} w-1 h-full bg-gradient-to-b from-[#B9A779] to-[#428177] rounded-full`}></div>
                  <p className="text-base sm:text-lg leading-relaxed text-slate-700 font-medium">
                    {t.whoWeAre.futureDirection}
                  </p>
                </div>
              </div>

              {/* Stats/Values Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {valuesKeys.map((key, index) => (
                  <div
                    key={key}
                    className="bg-white rounded-xl p-4 shadow-md border border-[#E8EBE9] text-center group hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#428177] to-[#002723] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-[#B9A779]/20">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#2B3130] font-sans">
                      {t.whoWeAre.values[key]}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 3. Vision & Mission Section (الرؤية والرسالة) */}
      <section id="vision-mission" className="relative py-20 lg:py-32 overflow-hidden bg-[#2B3130]">
        {/* Background Gradients & Grids */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2B3130] via-[#1a1f1e] to-[#2B3130]"></div>
        <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
          <div
            className="absolute inset-0 bg-repeat bg-[length:60px_60px]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>
        </div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#428177]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#B9A779]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Block */}
          <ScrollReveal type="up" className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-4">
              <div className="h-px w-20 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[#B9A779]"></div>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-[#428177]"></span>
                <span className="w-2 h-2 rounded-full bg-[#B9A779]"></span>
                <span className="w-2 h-2 rounded-full bg-[#428177]"></span>
              </div>
              <div className="h-px w-20 bg-gradient-to-l rtl:bg-gradient-to-r from-transparent to-[#B9A779]"></div>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white font-sans">
              {locale === "ar" ? "رؤية ورسالة الوزارة" : "Our Vision & Mission"}
            </h2>
          </ScrollReveal>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Vision Card */}
            <ScrollReveal type="left" className="group relative h-full">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#428177] to-[#B9A779] rounded-3xl opacity-20 group-hover:opacity-40 blur transition-opacity duration-500"></div>
              <div className="relative h-full bg-[#2B3130]/90 border border-white/10 rounded-3xl p-8 lg:p-10 flex flex-col justify-between overflow-hidden">
                <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-[#428177]/20 rounded-bl-xl"></div>
                
                <div>
                  <div className="relative mb-8 flex items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#428177] to-[#2B3130] flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300 border border-white/10">
                      {/* Eye Icon SVG */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className={`absolute top-1/2 ${isRtl ? "right-20" : "left-20"} w-20 h-px bg-gradient-to-r rtl:bg-gradient-to-l from-[#B9A779] to-transparent`}></div>
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold text-white mb-4 font-sans text-start">
                    {t.visionMission.vision.title}
                    <span className="block mt-2 h-1 w-16 bg-gradient-to-r from-[#B9A779] to-[#428177] rounded-full"></span>
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-slate-300 text-start font-light">
                    {t.visionMission.vision.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Mission Card */}
            <ScrollReveal type="right" className="group relative h-full">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#B9A779] to-[#428177] rounded-3xl opacity-20 group-hover:opacity-40 blur transition-opacity duration-500"></div>
              <div className="relative h-full bg-[#2B3130]/90 border border-white/10 rounded-3xl p-8 lg:p-10 flex flex-col justify-between overflow-hidden">
                <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-[#B9A779]/20 rounded-bl-xl"></div>

                <div>
                  <div className="relative mb-8 flex items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B9A779] to-[#8B7355] flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300 border border-white/10">
                      {/* Shield Check SVG */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div className={`absolute top-1/2 ${isRtl ? "right-20" : "left-20"} w-20 h-px bg-gradient-to-r rtl:bg-gradient-to-l from-[#428177] to-transparent`}></div>
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold text-white mb-4 font-sans text-start">
                    {t.visionMission.mission.title}
                    <span className="block mt-2 h-1 w-16 bg-gradient-to-r from-[#428177] to-[#B9A779] rounded-full"></span>
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-slate-300 text-start font-light">
                    {t.visionMission.mission.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 4. Minister's Word Section (كلمة السيد وزير الثقافة) */}
      <section id="minister-word" className="relative py-20 lg:py-32 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8f9fa] via-white to-[#f0f4f3] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#428177]/5 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-[#B9A779]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Floating background quotation icon */}
        <div className="absolute top-20 right-10 lg:right-32 opacity-5 select-none pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-40 h-40 lg:w-64 lg:h-64 text-[#428177]">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
          </svg>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Block */}
          <ScrollReveal type="up" className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-4">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[#B9A779]"></div>
              <span className="text-[#428177] font-bold text-xs md:text-sm tracking-wider uppercase">
                {t.ministerWord.subtitle}
              </span>
              <div className="h-px w-16 md:w-24 bg-gradient-to-l rtl:bg-gradient-to-r from-transparent to-[#B9A779]"></div>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#2B3130] font-sans">
              {t.ministerWord.title}
            </h2>
          </ScrollReveal>

          {/* Main Card */}
          <ScrollReveal type="scale" className="max-w-5xl mx-auto">
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E8EBE9] group">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#428177] via-[#B9A779] to-[#428177]"></div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Column 1: Minister Profile Card */}
                <div className="relative lg:col-span-1 bg-gradient-to-br from-[#2B3130] to-[#1a1f1e] p-8 flex flex-col items-center justify-center">
                  {/* Overlay dots decoration */}
                  <div className="absolute inset-0 opacity-10">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: "radial-gradient(circle at 2px 2px, rgba(185, 167, 121, 0.3) 1px, transparent 0)",
                        backgroundSize: "20px 20px"
                      }}
                    ></div>
                  </div>

                  {/* Avatar Wrapper */}
                  <div className="relative">
                    <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-full bg-gradient-to-br from-[#428177] to-[#B9A779] p-1 shadow-2xl relative z-10">
                      <div className="w-full h-full rounded-full bg-[#2B3130] flex items-center justify-center overflow-hidden">
                        <Image
                          src="/images/ministry.jpg"
                          alt={t.ministerWord.ministerName}
                          width={200}
                          height={200}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </div>
                    {/* dashed outer ring */}
                    <div className="absolute -inset-3.5 rounded-full border-2 border-dashed border-[#B9A779]/20 animate-[spin_80s_linear_infinite] z-0"></div>
                  </div>

                  {/* Profile texts */}
                  <div className="mt-8 text-center relative z-10">
                    <h4 className="text-xl font-extrabold text-white font-sans">
                      {t.ministerWord.ministerName}
                    </h4>
                    <p className="text-[#B9A779] mt-2 text-sm font-bold tracking-wider uppercase">
                      {t.ministerWord.ministerTitle}
                    </p>
                  </div>
                </div>

                {/* Column 2: Minister Word texts */}
                <div className="lg:col-span-2 p-8 lg:p-12 text-start flex flex-col justify-between">
                  <div className="space-y-6">
                    <p className="text-base sm:text-lg leading-relaxed text-[#3D3D3D] font-medium">
                      {t.ministerWord.paragraph1}
                    </p>
                    <p className="text-base sm:text-lg leading-relaxed text-[#3D3D3D] font-medium">
                      {t.ministerWord.paragraph2}
                    </p>
                    <p className="text-base sm:text-lg leading-relaxed text-[#3D3D3D] font-medium">
                      {t.ministerWord.paragraph3}
                    </p>
                  </div>

                  {/* Closing Blockquote */}
                  <div className="mt-8 pt-8 border-t border-[#E8EBE9]">
                    <blockquote className="relative px-6">
                      <div className={`absolute -top-4 ${isRtl ? "-right-2" : "-left-2"} text-6xl text-[#B9A779]/15 font-serif select-none pointer-events-none`}>
                        “
                      </div>
                      <p className="text-lg md:text-xl font-bold text-[#428177] leading-relaxed italic">
                        {t.ministerWord.closingQuote}
                      </p>
                      <div className={`absolute -bottom-6 ${isRtl ? "-left-2" : "-right-2"} text-6xl text-[#B9A779]/15 font-serif select-none pointer-events-none`}>
                        ”
                      </div>
                    </blockquote>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 5. Organizational Structure Section (الهيكل التنظيمي) */}
      <section id="organizational-structure" className="relative py-20 lg:py-32 overflow-hidden bg-[#FBF9F6] border-t border-[#E8EBE9]">
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Block */}
          <ScrollReveal type="up" className="text-center mb-16">
            <div className="inline-flex items-center gap-4 mb-4">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent to-[#B9A779]"></div>
              <span className="text-[#428177] font-bold text-xs md:text-sm tracking-wider uppercase">
                {locale === "ar" ? "إدارات الوزارة" : "Departments"}
              </span>
              <div className="h-px w-16 md:w-24 bg-gradient-to-l rtl:bg-gradient-to-r from-transparent to-[#B9A779]"></div>
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#2B3130] font-sans">
              {t.organizationalStructure.title}
            </h2>
            <p className="text-slate-500 text-sm md:text-base mt-3 max-w-2xl mx-auto font-medium">
              {t.organizationalStructure.subtitle}
            </p>
          </ScrollReveal>

          {/* Grids Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 items-start">
            {/* Column 1: Directorates (المديريات) */}
            <ScrollReveal type="left" className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl overflow-hidden text-start">
              <DecorativeCorners />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(66,129,119,0.01)_0%,transparent_75%)] pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 relative z-10">
                <h3 className="text-lg md:text-xl font-bold text-[#002723] font-sans flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#428177]"></span>
                  {t.organizationalStructure.directorates.title}
                </h3>
                <span className="text-xs px-3 py-1.5 bg-[#428177]/10 text-[#428177] rounded-full font-bold">
                  {directorateKeys.length} {t.organizationalStructure.directorates.count}
                </span>
              </div>

              {/* Items List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                {directorateKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 hover:text-[#428177] transition-all duration-300 border border-transparent hover:border-slate-100"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#B9A779] shrink-0"></div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 leading-snug hover:text-[#428177]">
                      {t.organizationalStructure.directorates.items[key]}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Column 2: Affiliated Entities (الجهات المرتبطة) */}
            <ScrollReveal type="right" className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl overflow-hidden text-start">
              <DecorativeCorners />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(185,167,121,0.01)_0%,transparent_75%)] pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 relative z-10">
                <h3 className="text-lg md:text-xl font-bold text-[#002723] font-sans flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B9A779]"></span>
                  {t.organizationalStructure.affiliatedEntities.title}
                </h3>
                <span className="text-xs px-3 py-1.5 bg-[#B9A779]/10 text-[#B9A779] rounded-full font-bold">
                  {affiliatedKeys.length} {t.organizationalStructure.affiliatedEntities.count}
                </span>
              </div>

              {/* Items List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                {affiliatedKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 hover:text-[#B9A779] transition-all duration-300 border border-transparent hover:border-slate-100"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#428177] shrink-0"></div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 leading-snug hover:text-[#B9A779]">
                      {t.organizationalStructure.affiliatedEntities.items[key]}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
