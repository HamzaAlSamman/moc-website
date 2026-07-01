"use client";

import React, { use } from "react";
import HeroSection from "../../components/HeroSection";
import MapSection from "../../components/MapSection";
import NewsSection from "../../components/NewsSection";
import HomeServicesSection from "../../components/HomeServicesSection";
import CulturalCalendarSection from "../../components/CulturalCalendarSection";
import MonthlyAchievementsSection from "../../components/MonthlyAchievementsSection";
import ValuesSection from "../../components/ValuesSection";
import EagleSection from "../../components/EagleSection";
import BottomQuoteSection from "../../components/BottomQuoteSection";
import ScrollReveal from "../../components/ScrollReveal";

export default function HomePage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";

  return (
    <div className="flex flex-col w-full gap-8 md:gap-12">
      {/* Hero Section - Above the fold, animates on load */}
      <HeroSection locale={locale} />

      {/* Syria Map / Heritage Section */}
      <ScrollReveal type="up" className="w-full">
        <MapSection locale={locale} />
      </ScrollReveal>

      {/* Latest News Section */}
      <ScrollReveal type="up" className="w-full">
        <NewsSection locale={locale} />
      </ScrollReveal>

      {/* Digital Services Section */}
      <ScrollReveal type="up" className="w-full">
        <HomeServicesSection locale={locale} />
      </ScrollReveal>

      {/* Cultural Calendar Section */}
      <ScrollReveal type="up" className="w-full">
        <CulturalCalendarSection locale={locale} />
      </ScrollReveal>

      {/* Ministry Monthly Achievements Section */}
      <ScrollReveal type="up" className="w-full">
        <MonthlyAchievementsSection locale={locale} />
      </ScrollReveal>

      {/* Values & Principles Section */}
      <ScrollReveal type="scale" className="w-full">
        <ValuesSection locale={locale} />
      </ScrollReveal>

      {/* Syrian Eagle / Memory Section */}
      <ScrollReveal type="up" className="w-full">
        <EagleSection locale={locale} />
      </ScrollReveal>

      {/* Bottom Quote / Vision Section */}
      <ScrollReveal type="scale" className="w-full">
        <BottomQuoteSection locale={locale} />
      </ScrollReveal>
    </div>
  );
}
