"use client";

import React, { createContext, useContext } from "react";
import { translations } from "../data/translations";

const SettingsContext = createContext({});

export function SettingsProvider({ dbSettings, locale, children }) {
  const tCommon = translations[locale]?.common || translations.ar.common;

  const merged = {
    email: dbSettings.contact_email || tCommon.email,
    phone: dbSettings.contact_phone || tCommon.phone,
    address: (locale === "ar" ? dbSettings.address_ar : dbSettings.address_en) || tCommon.address,
    siteName: (locale === "ar" ? dbSettings.site_name_ar : dbSettings.site_name_en) || tCommon.title,
    facebookUrl: dbSettings.facebook_url || "https://www.facebook.com/SyrSMOC/",
    twitterUrl: dbSettings.twitter_url || "https://x.com/mocsyr",
    youtubeUrl: dbSettings.youtube_url || "https://www.youtube.com/@MinistryofCultureSyria",
    instagramUrl: "https://instagram.com/mocsyr/",
    postsPerPage: Math.max(1, parseInt(dbSettings.posts_per_page, 10) || 10),
  };

  return (
    <SettingsContext.Provider value={merged}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
