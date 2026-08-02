"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import DecorativeCorners from "./DecorativeCorners";
import ImageWithFallback from "./ImageWithFallback";
import { translations } from "../data/translations";
import SubpageHero from "./SubpageHero";

/* ─────────────────────────────────────────────
   EVENT TYPE PALETTE
   Aligned with official brand gold, emerald, sand, and bronze
 ───────────────────────────────────────────── */
const TYPE = {
  "ثقافي":  { labelAr: "ثقافي", labelEn: "Cultural", color: "#1C665A", light: "bg-[#1C665A]/10 text-[#1C665A] border-[#1C665A]/20" },
};

const GOVERNORATES = [
  { ar: "الكل", en: "All" },
  { ar: "دمشق", en: "Damascus" },
  { ar: "ريف دمشق", en: "Rif Dimashq" },
  { ar: "حلب", en: "Aleppo" },
  { ar: "حمص", en: "Homs" },
  { ar: "حماة", en: "Hama" },
  { ar: "اللاذقية", en: "Latakia" },
  { ar: "طرطوس", en: "Tartus" },
  { ar: "السويداء", en: "As-Suwayda" },
  { ar: "درعا", en: "Daraa" },
  { ar: "القنيطرة", en: "Quneitra" },
  { ar: "دير الزور", en: "Deir ez-Zor" },
  { ar: "الرقة", en: "Raqqa" },
  { ar: "الحسكة", en: "Al-Hasakah" },
  { ar: "إدلب", en: "Idlib" }
];

const DAYS_SHORT_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const DAYS_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_MOBILE_AR = ["أح", "اث", "ثل", "أر", "خم", "جم", "سب"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ─────────────────────────────────────────────
   HELPERS & LOCALIZED CONSTANTS
 ───────────────────────────────────────────── */
function formatFullLocation(ev, isRtl) {
  if (!ev) return "";
  const gov = isRtl ? ev.governorate : (ev.governorateEn || ev.governorate);
  const loc = isRtl ? ev.location : (ev.locationEn || ev.location);
  if (gov && loc) return `${gov}، ${loc}`;
  return gov || loc || "";
}

function formatEventTime(dateStr, isRtl) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const h = d.getUTCHours();
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const h12 = String(h % 12 || 12).padStart(2, "0");
  const period = h >= 12 ? (isRtl ? "م" : "PM") : (isRtl ? "ص" : "AM");
  return `${h12}:${mi} ${period}`;
}

function formatEventDate(dateStr, isRtl, short = false) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;

  const day = d.getUTCDate();
  const year = d.getUTCFullYear();

  if (isRtl) {
    const monthName = MONTHS_AR[d.getUTCMonth()];
    if (short) {
      return `${day} ${monthName} ${year}`;
    }
    const weekdaysFull = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const wDay = weekdaysFull[d.getUTCDay()];
    return `${wDay}، ${day} ${monthName} ${year}`;
  } else {
    if (short) {
      const monthName = MONTHS_EN[d.getUTCMonth()].slice(0, 3);
      return `${day} ${monthName} ${year}`;
    }
    const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthName = MONTHS_EN[d.getUTCMonth()];
    const wDay = weekdaysFull[d.getUTCDay()];
    return `${wDay}, ${monthName} ${day}, ${year}`;
  }
}

function isSameUTCDay(startStr, endStr) {
  if (!startStr || !endStr) return true;
  const s = new Date(startStr);
  const e = new Date(endStr);
  return s.getUTCFullYear() === e.getUTCFullYear() &&
         s.getUTCMonth() === e.getUTCMonth() &&
         s.getUTCDate() === e.getUTCDate();
}

function formatEventDateRange(startStr, endStr, isRtl, short = true) {
  if (!endStr || isSameUTCDay(startStr, endStr)) {
    return formatEventDate(startStr, isRtl, short);
  }
  return formatEventDate(startStr, isRtl, short) + " — " + formatEventDate(endStr, isRtl, short);
}

function formatEventTimeRange(startStr, endStr, isRtl) {
  const start = formatEventTime(startStr, isRtl);
  if (!endStr || !isSameUTCDay(startStr, endStr)) return start;
  return start + " — " + formatEventTime(endStr, isRtl);
}

function getTypeLabel(ev, isRtl) {
  if (!ev) return "";
  if (ev.eventCategory) {
    return isRtl ? ev.eventCategory.nameAr : (ev.eventCategory.nameEn || ev.eventCategory.nameAr);
  }
  if (ev.eventType) {
    return isRtl ? ev.eventType.nameAr : (ev.eventType.nameEn || ev.eventType.nameAr);
  }
  const fallback = TYPE[ev.type];
  if (fallback) {
    return isRtl ? fallback.labelAr : fallback.labelEn;
  }
  return ev.type || "";
}

function resolveEventType(title = "") {
  return "ثقافي";
}

function buildCalendarGrid(year, month) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const total = new Date(year, month, 0).getDate();
  const cells = Array(firstDow).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/* Normalize any date input to the numeric value of its UTC calendar day (midnight). */
function utcDayValue(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return NaN;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/* Status across the WHOLE event range: an event stays "ongoing" until its
   end date has passed, so a multi-day event is not marked "finished" on day one. */
function getEventStatus(startStr, endStr) {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const startVal = utcDayValue(startStr);
  if (isNaN(startVal)) return "upcoming";
  const endVal = endStr && !isNaN(utcDayValue(endStr)) ? utcDayValue(endStr) : startVal;

  if (endVal < today) return "finished";   // entire event is in the past
  if (startVal > today) return "upcoming";  // event has not started yet
  return "ongoing";                          // today falls within [start, end]
}

/* True when the given calendar day (year/month/day) falls within the event's
   [startDate, endDate] range — used so multi-day events appear on every day. */
function eventCoversDay(ev, year, month, day) {
  const target = Date.UTC(year, month - 1, day);
  const startVal = utcDayValue(ev.startDate);
  if (isNaN(startVal)) return false;
  const endVal = ev.endDate && !isNaN(utcDayValue(ev.endDate)) ? utcDayValue(ev.endDate) : startVal;
  return target >= startVal && target <= endVal;
}

/* True when the event's range overlaps any day of the given month. */
function eventOverlapsMonth(ev, year, month) {
  const startVal = utcDayValue(ev.startDate);
  if (isNaN(startVal)) return false;
  const endVal = ev.endDate && !isNaN(utcDayValue(ev.endDate)) ? utcDayValue(ev.endDate) : startVal;
  const monthStart = Date.UTC(year, month - 1, 1);
  const monthEnd = Date.UTC(year, month, 0); // day 0 of next month = last day of this month
  return startVal <= monthEnd && endVal >= monthStart;
}

/* ─────────────────────────────────────────────
   SVG ICONS
 ───────────────────────────────────────────── */
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#A48E68]">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#A48E68]">
    <path d="M12 21s-7-5.686-7-11a7 7 0 1114 0c0 5.314-7 11-7 11z"/>
    <circle cx="12" cy="10" r="2.5"/>
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#A48E68]">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT
 ───────────────────────────────────────────── */
export default function CulturalCalendarSection({ locale, isDedicated = false }) {
  const isRtl = locale === "ar";
  const t = translations[locale]?.common || translations.ar.common;

  const [year, setYear]               = useState(2026);
  const [month, setMonth]             = useState(5);
  const [selectedDay, setSelectedDay] = useState(null);
  const [search, setSearch]           = useState("");
  const [selectedGov, setSelectedGov] = useState("الكل");
  const [selectedType, setSelectedType] = useState("الكل");
  const [selectedStatus, setSelectedStatus] = useState("all"); // all, upcoming, past
  
  const [eventsData, setEventsData] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([
    { id: "mock-1", nameAr: "أمسية شعرية", nameEn: "Poetry Evening", color: "#8B4513" },
    { id: "mock-2", nameAr: "تراثية \\ ثقافية", nameEn: "Heritage / Cultural", color: "#FF69B4" },
    { id: "mock-3", nameAr: "فعالية مجتمعية", nameEn: "Community Event", color: "#D4AF37" },
    { id: "mock-4", nameAr: "مؤتمر", nameEn: "Conference", color: "#800000" },
    { id: "mock-5", nameAr: "مسابقة ثقافية", nameEn: "Cultural Competition", color: "#20B2AA" },
    { id: "mock-6", nameAr: "معرض", nameEn: "Exhibition", color: "#008080" },
    { id: "mock-7", nameAr: "ملتقى ثقافي", nameEn: "Cultural Forum", color: "#4B0082" },
    { id: "mock-8", nameAr: "مهرجان", nameEn: "Festival", color: "#708090" },
    { id: "mock-9", nameAr: "ندوة ومحاضرة", nameEn: "Seminar & Lecture", color: "#32CD32" },
    { id: "mock-10", nameAr: "ورشة عمل وتدريب", nameEn: "Workshop & Training", color: "#483D8B" },
    { id: "mock-11", nameAr: "حفل غنائي وموسيقى", nameEn: "Concert & Music", color: "#E74C3C" },
    { id: "mock-12", nameAr: "عرض سينمائي", nameEn: "Cinema Screening", color: "#2ECC71" },
    { id: "mock-13", nameAr: "توقيع كتاب ورواية", nameEn: "Book Signing", color: "#3498DB" },
    { id: "mock-14", nameAr: "معرض فنون تشكيلية", nameEn: "Fine Arts Exhibition", color: "#C0392B" },
    { id: "mock-15", nameAr: "صالون أدبي فكري", nameEn: "Literary Salon", color: "#F39C12" },
  ]);
  const [eventKindsList, setEventKindsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailEvent, setDetailEvent] = useState(null); // Selected event for Detail Modal
  const [selectedKind, setSelectedKind] = useState("الكل");

  useEffect(() => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());

    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/event-categories").then((r) => r.json()),
      fetch("/api/event-kinds").then((r) => r.json()),
    ])
      .then(([events, types, kinds]) => {
        if (Array.isArray(types)) {
          const mockCategories = [
            { id: "mock-1", nameAr: "أمسية شعرية", nameEn: "Poetry Evening", color: "#8B4513" },
            { id: "mock-2", nameAr: "تراثية \\ ثقافية", nameEn: "Heritage / Cultural", color: "#FF69B4" },
            { id: "mock-3", nameAr: "فعالية مجتمعية", nameEn: "Community Event", color: "#D4AF37" },
            { id: "mock-4", nameAr: "مؤتمر", nameEn: "Conference", color: "#800000" },
            { id: "mock-5", nameAr: "مسابقة ثقافية", nameEn: "Cultural Competition", color: "#20B2AA" },
            { id: "mock-6", nameAr: "معرض", nameEn: "Exhibition", color: "#008080" },
            { id: "mock-7", nameAr: "ملتقى ثقافي", nameEn: "Cultural Forum", color: "#4B0082" },
            { id: "mock-8", nameAr: "مهرجان", nameEn: "Festival", color: "#708090" },
            { id: "mock-9", nameAr: "ندوة ومحاضرة", nameEn: "Seminar & Lecture", color: "#32CD32" },
            { id: "mock-10", nameAr: "ورشة عمل وتدريب", nameEn: "Workshop & Training", color: "#483D8B" },
            { id: "mock-11", nameAr: "حفل غنائي وموسيقى", nameEn: "Concert & Music", color: "#E74C3C" },
            { id: "mock-12", nameAr: "عرض سينمائي", nameEn: "Cinema Screening", color: "#2ECC71" },
            { id: "mock-13", nameAr: "توقيع كتاب ورواية", nameEn: "Book Signing", color: "#3498DB" },
            { id: "mock-14", nameAr: "معرض فنون تشكيلية", nameEn: "Fine Arts Exhibition", color: "#C0392B" },
            { id: "mock-15", nameAr: "صالون أدبي فكري", nameEn: "Literary Salon", color: "#F39C12" },
          ];
          const merged = [...types];
          mockCategories.forEach(mc => {
            if (!merged.some(c => c.nameAr === mc.nameAr)) {
              merged.push(mc);
            }
          });
          setEventTypesList(merged);
        }
        if (Array.isArray(kinds)) {
          setEventKindsList(kinds);
        }
        if (Array.isArray(events)) {
          const mapped = events.map((ev) => {
            let color = "#1C665A";
            if (ev.eventCategory) {
              color = ev.eventCategory.color || "#1C665A";
            } else if (ev.eventType) {
              color = ev.eventType.color || "#1C665A";
            } else {
              const fallbackType = resolveEventType(ev.titleAr);
              color = TYPE[fallbackType]?.color || "#1C665A";
            }
            return {
              ...ev,
              type: ev.eventCategory ? ev.eventCategory.nameAr : (ev.eventType ? ev.eventType.nameAr : resolveEventType(ev.titleAr)),
              typeColor: color
            };
          });
          setEventsData(mapped);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const goMonth = useCallback((dir) => {
    setSelectedDay(null);
    setMonth((m) => {
      const next = m + dir;
      if (next < 1) {
        setYear((y) => y - 1);
        return 12;
      }
      if (next > 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return next;
    });
  }, []);

  const handleDaySelect = useCallback((day) => {
    setSelectedDay((prev) => (prev === day ? null : day));
    if (day && window.innerWidth < 1024) {
      setTimeout(() => {
        const sidebar = document.getElementById("events-sidebar-panel");
        if (sidebar) {
          sidebar.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 80);
    }
  }, []);

  const monthKey = `${year}-${month}`;
  const cells = buildCalendarGrid(year, month);
  const days = isRtl ? DAYS_SHORT_AR : DAYS_SHORT_EN;
  const monthName = isRtl ? MONTHS_AR[month - 1] : MONTHS_EN[month - 1];

  // Group events for calendar dots — a multi-day event is registered on EVERY
  // calendar day it spans, not only its start day.
  const calendarEvents = {};
  eventsData.forEach((ev) => {
    const start = new Date(ev.startDate);
    if (isNaN(start)) return;
    const endSource = ev.endDate && !isNaN(new Date(ev.endDate)) ? new Date(ev.endDate) : start;

    let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const last = Date.UTC(endSource.getUTCFullYear(), endSource.getUTCMonth(), endSource.getUTCDate());
    let guard = 0;
    while (cursor <= last && guard < 400) {
      const c = new Date(cursor);
      const key = `${c.getUTCFullYear()}-${c.getUTCMonth() + 1}`;
      const day = c.getUTCDate();
      if (!calendarEvents[key]) calendarEvents[key] = {};
      if (!calendarEvents[key][day]) calendarEvents[key][day] = [];
      calendarEvents[key][day].push(ev);
      cursor += 86400000; // advance one UTC day (DST-safe)
      guard++;
    }
  });

  // Helper to filter events based on current dropdowns & search query
  const matchesEventFilters = useCallback((ev) => {
    // Search query match
    const title = isRtl ? ev.titleAr : (ev.titleEn || ev.titleAr);
    const desc = isRtl ? ev.descriptionAr : (ev.descriptionEn || ev.descriptionAr);
    const location = isRtl ? ev.location : (ev.locationEn || ev.location);

    const matchesSearch =
      !search ||
      title?.toLowerCase().includes(search.toLowerCase()) ||
      desc?.toLowerCase().includes(search.toLowerCase()) ||
      location?.toLowerCase().includes(search.toLowerCase());

    // Governorate match
    const matchesGov =
      selectedGov === "الكل" ||
      ev.governorate === selectedGov ||
      ev.governorateEn === selectedGov ||
      ev.location?.includes(selectedGov) ||
      ev.locationEn?.toLowerCase().includes(selectedGov.toLowerCase());

    // Category / Type match
    const matchesType =
      selectedType === "الكل" ||
      ev.eventCategoryId === selectedType ||
      ev.eventTypeId === selectedType ||
      ev.type === selectedType ||
      ev.eventCategory?.id === selectedType ||
      ev.eventCategory?.nameAr === selectedType ||
      ev.eventType?.id === selectedType ||
      ev.eventType?.nameAr === selectedType;

    // Event Kind match
    const matchesKind =
      selectedKind === "الكل" ||
      ev.eventKindId === selectedKind ||
      ev.eventKind?.id === selectedKind ||
      ev.eventKind?.nameAr === selectedKind;

    // Status match — based on the whole event range
    const status = getEventStatus(ev.startDate, ev.endDate);
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "upcoming" && (status === "upcoming" || status === "ongoing")) ||
      (selectedStatus === "past" && status === "finished");

    return matchesSearch && matchesGov && matchesType && matchesKind && matchesStatus;
  }, [search, selectedGov, selectedType, selectedKind, selectedStatus, isRtl]);

  // Filter events list
  const filteredEvents = eventsData.filter((ev) => {
    // Date / Calendar Selection match — a multi-day event matches any day it spans.
    const matchesCalendarDay =
      selectedDay === null
        ? eventOverlapsMonth(ev, year, month)
        : eventCoversDay(ev, year, month, selectedDay);

    return matchesCalendarDay && matchesEventFilters(ev);
  });

  const calendarContent = (
    <>
      {/* ── Filter bar ── */}
      <div className="bg-white rounded-3xl px-7 pt-8 pb-6 sm:p-6 border border-slate-100 shadow-md mb-8 xl:mb-12 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch relative z-20 flex-wrap">
        <DecorativeCorners />
        
        {/* Search Input */}
        <div className="flex-1 min-w-[240px] relative flex items-center bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus-within:border-[#988561] rounded-2xl px-4 py-2.5 transition-all duration-300">
          <div className="flex-grow flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder={isRtl ? "ابحث عن فعالية..." : "Search for an event..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              dir={isRtl ? "rtl" : "ltr"}
              className="w-full bg-transparent border-none outline-none text-slate-700 text-sm placeholder-slate-400 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 shrink-0"
                title={isRtl ? "مسح البحث" : "Clear search"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Governorate Dropdown */}
        <div className="flex flex-col gap-1 shrink-0 min-w-[150px]">
          <select
            value={selectedGov}
            onChange={(e) => setSelectedGov(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus:border-[#988561] text-slate-700 font-medium rounded-2xl py-3 px-4 outline-none text-sm transition-all duration-300"
          >
            <option value="الكل">{isRtl ? "كل المحافظات" : "All Governorates"}</option>
            {GOVERNORATES.slice(1).map((gov) => (
              <option key={gov.ar} value={gov.ar}>{isRtl ? gov.ar : gov.en}</option>
            ))}
          </select>
        </div>

        {/* Event type dropdown */}
        <div className="flex flex-col gap-1 shrink-0 min-w-[150px]">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus:border-[#988561] text-slate-700 font-medium rounded-2xl py-3 px-4 outline-none text-sm transition-all duration-300"
          >
            <option value="الكل">{isRtl ? "كل الفئات" : "All Categories"}</option>
            {eventTypesList.map((type) => (
              <option key={type.id} value={type.id}>
                {isRtl ? type.nameAr : (type.nameEn || type.nameAr)}
              </option>
            ))}
            {Object.entries(TYPE)
              .filter(([key]) => !eventTypesList.some((t) => t.nameAr === key))
              .map(([key, val]) => (
                <option key={key} value={key}>
                  {isRtl ? val.labelAr : val.labelEn}
                </option>
              ))}
          </select>
        </div>

        {/* Event Kind dropdown */}
        <div className="flex flex-col gap-1 shrink-0 min-w-[150px]">
          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-[#988561]/40 focus:border-[#988561] text-slate-700 font-medium rounded-2xl py-3 px-4 outline-none text-sm transition-all duration-300"
          >
            <option value="الكل">{isRtl ? "كل الأنواع" : "All Types"}</option>
            {eventKindsList.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {isRtl ? kind.nameAr : (kind.nameEn || kind.nameAr)}
              </option>
            ))}
          </select>
        </div>

        {/* Status buttons */}
        <div className="flex bg-slate-100 rounded-2xl p-1 shrink-0 gap-1 w-full sm:w-auto">
          {[
            { id: "all", ar: "الكل", en: "All" },
            { id: "upcoming", ar: "القادمة", en: "Upcoming" },
            { id: "past", ar: "المنتهية", en: "Past" }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`flex-1 px-4 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedStatus === st.id
                  ? "bg-[#002723] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {isRtl ? st.ar : st.en}
            </button>
          ))}
        </div>

      </div>

      {/* ── Calendar Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_440px] gap-6 xl:gap-8 items-stretch relative z-10 w-full">
        
        {/* Column 1: Calendar Grid */}
        <div className="group relative bg-white border border-[#A48E68]/15 rounded-3xl px-6 pt-7 pb-5 sm:p-6 md:p-8 shadow-md flex flex-col justify-between overflow-hidden">
          <DecorativeCorners />
          
          <div>
            {/* Header Month Navigation */}
            <div className="flex items-center justify-between mb-8 relative z-10 px-4 pt-2">
              <button
                onClick={() => goMonth(-1)}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-[#002723]/10 border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {isRtl ? <IconChevronRight /> : <IconChevronLeft />}
              </button>
              <div className="text-center">
                <div className="text-primary font-black text-xl font-sans tracking-wide">
                  {monthName}
                </div>
                <div className="text-[#A48E68] text-xs font-bold tracking-widest mt-1">{year}</div>
              </div>
              <button
                onClick={() => goMonth(1)}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-[#002723]/10 border border-slate-100 flex items-center justify-center text-slate-600 hover:text-primary transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {isRtl ? <IconChevronLeft /> : <IconChevronRight />}
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-4 relative z-10">
              {days.map((d, i) => (
                <div key={d} className="text-center text-[#A48E68] text-[10px] xs:text-xs font-bold py-2 border-b border-[#A48E68]/10">
                  <span className="md:hidden">{isRtl ? DAYS_MOBILE_AR[i] : DAYS_SHORT_EN[i].slice(0, 2)}</span>
                  <span className="hidden md:inline">{d}</span>
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 relative z-10">
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />;
                
                const isSelected = selectedDay === day;
                const todayObj = new Date();
                const isToday = todayObj.getFullYear() === year && (todayObj.getMonth() + 1) === month && todayObj.getDate() === day;
                
                // Filter events for this specific cell day
                const dayEvents = (calendarEvents[monthKey]?.[day] || []).filter(matchesEventFilters);

                const hasEvents = dayEvents.length > 0;
                const dotColors = dayEvents.slice(0, 3).map(e => e.typeColor || "#1C665A");

                return (
                  <button
                    key={idx}
                    onClick={() => handleDaySelect(day)}
                    className={`
                      relative flex flex-col items-center justify-center
                      min-h-[38px] sm:min-h-[48px] md:min-h-[56px] rounded-xl sm:rounded-2xl
                      transition-all duration-350 ease-out cursor-pointer
                      focus-visible:outline-2 focus-visible:outline-[#988561] focus-visible:outline-offset-2
                      hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:shadow-md hover:scale-[1.05]
                      ${isSelected
                        ? "bg-gradient-to-br from-[#002723] to-[#428177] text-white shadow-lg font-black border-transparent scale-105"
                        : hasEvents
                          ? "bg-[#002723]/5 hover:bg-[#002723]/10 text-primary border border-[#002723]/10 hover:border-[#988561]/40 calendar-tile-event"
                          : "text-slate-400 hover:bg-slate-50 hover:text-slate-800 border border-transparent"
                      }
                    `}
                  >
                    <span className={`text-xs sm:text-sm md:text-base font-bold leading-none ${
                      isToday && !isSelected
                        ? "text-[#A48E68] font-black underline decoration-2 underline-offset-4"
                        : isSelected
                          ? "text-white"
                          : "text-slate-800"
                    }`}>
                      {day}
                    </span>
                    {/* Event indicator dots */}
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-1">
                        {dotColors.slice(0, 2).map((c, i) => (
                          <span
                            key={i}
                            className={`block w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-transform duration-300 hover:scale-125 ${isSelected ? "bg-white" : ""}`}
                            style={{ background: isSelected ? undefined : c }}
                          />
                        ))}
                      </div>
                    )}
                    {/* Multi-event count badge */}
                    {hasEvents && dayEvents.length > 1 && !isSelected && (
                      <span className="absolute top-0.5 end-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full number-circle text-[8px] sm:text-[9px] font-black flex items-center justify-center"
                            style={{ background: (dayEvents[0].typeColor || "#1C665A") + "25", color: dayEvents[0].typeColor || "#1C665A" }}>
                        {dayEvents.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend categories (Structured, centered flex wrap design for official government website) */}
          <div 
            className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap justify-center gap-x-6 gap-y-3 max-w-4xl mx-auto px-4"
            dir={isRtl ? "rtl" : "ltr"}
          >
            {eventTypesList.map((type) => (
              <div key={type.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-400 select-none">
                <span 
                  className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                  style={{ background: type.color || "#1C665A" }} 
                />
                <span className="truncate">{isRtl ? type.nameAr : (type.nameEn || type.nameAr)}</span>
              </div>
            ))}
            {Object.entries(TYPE)
              .filter(([k]) => !eventTypesList.some(t => t.nameAr === k))
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-[11px] font-bold text-slate-400 select-none">
                  <span 
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                    style={{ background: v.color }} 
                  />
                  <span className="truncate">{isRtl ? v.labelAr : v.labelEn}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Column 2: Sidebar Events Panel */}
        <div id="events-sidebar-panel" className="flex flex-col justify-start relative z-10">
          <div className="bg-white border border-[#A48E68]/15 rounded-3xl px-6 pt-7 pb-5 sm:p-6 shadow-md flex flex-col h-full overflow-hidden max-h-[440px] md:max-h-[520px] xl:max-h-[580px] 2xl:max-h-[640px] relative">
            <DecorativeCorners />
            
            {/* Sidebar Header */}
            <div className="border-b border-slate-100 pb-4 mb-4 px-3 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 z-10 relative">
              <div>
                <h4 className="text-[#002723] font-extrabold text-sm uppercase tracking-wider text-start">
                  {selectedDay === null ? (
                    isRtl ? `كل فعاليات شهر ${monthName}` : `${monthName} Events (All)`
                  ) : (
                    isRtl ? `فعاليات يوم ${selectedDay} ${monthName}` : `Events on ${monthName} ${selectedDay}`
                  )}
                </h4>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5 text-start">
                  {filteredEvents.length} {filteredEvents.length === 1 ? (isRtl ? "فعالية مطابقة" : "event found") : (isRtl ? "فعاليات مطابقة" : "events found")}
                </span>
              </div>

              {selectedDay !== null && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[10px] font-extrabold bg-[#A48E68]/10 text-primary hover:bg-[#A48E68]/20 border border-[#A48E68]/25 rounded-lg py-1 px-2.5 transition active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  {isRtl ? "عرض الكل" : "Show All"}
                </button>
              )}
            </div>

            {/* Scrollable list of cards */}
            <div className="flex-1 overflow-y-auto pr-1 sidebar-scroll space-y-4 z-10 relative">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-8 h-8 border-2 border-[#A48E68] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((ev) => {
                  const status = getEventStatus(ev.startDate, ev.endDate);
                  const isFinished = status === "finished";
                  const isOngoing = status === "ongoing";

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setDetailEvent(ev)}
                      className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex p-3 gap-3.5 text-start cursor-pointer shadow-sm relative border border-slate-100 hover:border-[#988561]/40"
                    >
                      {/* Mini Thumbnail */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                        <ImageWithFallback
                          src={ev.featuredImage}
                          alt={isRtl ? ev.titleAr : (ev.titleEn || ev.titleAr)}
                          fill
                          sizes="80px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Mini Overlay Status Banner */}
                        <div className="absolute bottom-1 inset-x-1 z-10 flex">
                          {isFinished ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-red-400 text-red-500 mx-auto">
                              {isRtl ? "منتهية" : "Past"}
                            </span>
                          ) : isOngoing ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#A48E68] text-white shadow-sm mx-auto animate-pulse">
                              {isRtl ? "جارية الآن" : "Now"}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#428177] text-white shadow-sm mx-auto animate-pulse">
                              {isRtl ? "قريباً" : "Upcoming"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Text info block */}
                      <div className="flex-grow flex flex-col justify-between py-0.5 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full inline-block" style={{
                            color: ev.typeColor || "#1C665A",
                            background: `${ev.typeColor || "#1C665A"}15`
                          }}>
                            {getTypeLabel(ev, isRtl)}
                          </span>
                          {ev.eventKind && (
                            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full inline-block ml-1" style={{
                              color: ev.eventKind.color || "#6C4A8F",
                              background: `${ev.eventKind.color || "#6C4A8F"}15`
                            }}>
                              {isRtl
                                ? (ev.eventKind.nameAr || "")
                                : (ev.eventKind.nameEn || ev.eventKind.nameAr || "")}
                            </span>
                          )}
                          <h3 className="text-[#002723] font-extrabold text-sm sm:text-base leading-snug group-hover:text-[#988561] transition-colors line-clamp-2">
                            {isRtl ? ev.titleAr : (ev.titleEn || ev.titleAr)}
                          </h3>
                        </div>
                        
                        <div className="flex flex-col gap-1 text-xs text-slate-500 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <IconCalendar />
                            <span>{formatEventDateRange(ev.startDate, ev.endDate, isRtl, true)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <IconClock />
                            <span>{formatEventTimeRange(ev.startDate, ev.endDate, isRtl)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <IconPin />
                            <span className="line-clamp-1">{formatFullLocation(ev, isRtl)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-[#A48E68]/60">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <h5 className="text-[#002723] font-bold text-xs">
                    {isRtl ? "لا توجد فعاليات مطابقة" : "No matching events"}
                  </h5>
                  <p className="text-slate-400 text-[10px] max-w-[200px] leading-relaxed">
                    {isRtl ? "لا توجد فعاليات لخيارات الفلترة أو اليوم المحدد حالياً." : "No activities match the current filters or selected day."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );

  return (
    <div className={isDedicated ? "relative flex flex-col w-full min-h-screen bg-[#FBF9F6] pt-[84px] md:pt-[88px] lg:pt-[104px]" : "relative w-full"} dir={isRtl ? "rtl" : "ltr"}>
      {/* Custom slow-drifting floating animations & scrollbars */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow-1 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-30px) translateX(20px) scale(1.1); }
        }
        @keyframes float-slow-2 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1.05); }
          50% { transform: translateY(40px) translateX(-30px) scale(0.95); }
        }
        @keyframes float-slow-3 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-20px) translateX(-25px) scale(1.08); }
        }
        .animate-float-1 {
          animation: float-slow-1 12s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-slow-2 16s ease-in-out infinite;
        }
        .animate-float-3 {
          animation: float-slow-3 14s ease-in-out infinite;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #A48E68/40;
          border-radius: 9999px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #A48E68;
        }
      `}} />

      {/* Repeating background pattern */}
      {!isDedicated && (
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "url(/svg/unisco_pattern.svg)", backgroundSize: "130px", backgroundRepeat: "repeat" }}
        />
      )}

      {/* Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] start-[10%] w-[350px] h-[350px] rounded-full bg-[#A48E68]/4 blur-[90px] animate-float-1" />
        <div className="absolute top-[40%] end-[5%] w-[400px] h-[400px] rounded-full bg-[#1C665A]/4 blur-[100px] animate-float-2" />
        <div className="absolute bottom-[25%] start-[5%] w-[380px] h-[380px] rounded-full bg-[#6C4A8F]/3 blur-[95px] animate-float-3" />
        <div className="absolute bottom-[5%] end-[15%] w-[320px] h-[320px] rounded-full bg-[#b9a779]/4 blur-[85px] animate-float-1" />
      </div>

      {isDedicated ? (
        <>
          {/* ── Subpage Hero ── */}
          <SubpageHero
            title={isRtl ? "الروزنامة الثقافية" : "Cultural Calendar"}
            subtitle={isRtl ? "وزارة الثقافة السورية" : "Syrian Ministry of Culture"}
            description={
              isRtl 
                ? "دليلك الكامل للأنشطة والفعاليات الثقافية والفنية في مختلف المحافظات السورية."
                : "Your comprehensive guide to cultural and artistic events across Syrian governorates."
            }
            isRtl={isRtl}
          />

          {/* ── Main content grid ── */}
          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 sm:py-12 xl:py-16 w-full flex-grow relative z-10">
            {calendarContent}

            {/* Full-Width Proposal CTA Banner */}
            <div className="group mt-16 relative rounded-3xl overflow-hidden border border-[#A48E68]/20 bg-gradient-to-r rtl:bg-gradient-to-l from-[#002723] via-[#0D443C] to-[#1C665A] p-8 sm:p-10 shadow-lg text-start flex flex-col md:flex-row items-center justify-between gap-6">
              <DecorativeCorners />
              
              {/* UNESCO repeating pattern as background */}
              <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none">
                <div className="absolute inset-0 bg-[url(/svg/unisco_pattern.svg)] bg-repeat" />
              </div>
              
              <div className="relative z-10 max-w-2xl space-y-3">
                <span className="text-[10px] uppercase text-[#A48E68] font-extrabold tracking-widest leading-none border border-[#A48E68]/30 rounded-full px-3 py-1 bg-white/5">
                  {isRtl ? "المشاركة الثقافية" : "Cultural Collaboration"}
                </span>
                <h3 className="text-white font-extrabold text-xl sm:text-2xl font-sans">
                  {isRtl 
                    ? "هل ترغب في نشر فعاليتك الثقافية على الروزنامة الثقافية؟" 
                    : "Do you want to publish your event on the National Calendar?"}
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans max-w-xl">
                  {isRtl 
                    ? "تتيح وزارة الثقافة للمواطنين تقديم طلب إقامة فعالياتهم لتضاف إلى الروزنامة الثقافية بعد مراجعتها وتدقيقها."
                    : "The Ministry of Culture invites cultural centers, NGO groups, and independent artists to suggest events to be listed on the national portal."}
                </p>
              </div>

              <div className="relative z-10 shrink-0">
                <Link
                  href={`/${locale}/services/submit-event`}
                  className="inline-flex items-center gap-2 bg-[#A48E68] hover:bg-[#8B7355] text-[#002723] hover:text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-full shadow-md transition-all duration-300 transform active:scale-95 group-hover:shadow-[#A48E68]/20"
                >
                  <span>{isRtl ? "طلب تقديم إقامة فعالية" : "Submit Event Hosting Request"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    {isRtl ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    )}
                  </svg>
                </Link>
              </div>
            </div>
          </main>
        </>
      ) : (
        <section
          id="calendar"
          className="relative py-12 md:py-24 bg-[#FBF9F6] overflow-hidden scroll-mt-28 w-full"
        >
          <div className="container mx-auto px-6 md:px-16 relative z-10 w-full">
            {/* ── Section Header ── */}
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 text-[#988561] text-xs font-bold tracking-[0.2em] uppercase mb-4 border border-[#988561]/20 rounded-full px-5 py-2 bg-[#988561]/5 shadow-sm">
                <IconCalendar />
                {isRtl ? "الروزنامة الثقافية" : "Cultural Calendar"}
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-[#002723] leading-tight font-qomra">
                {isRtl ? "فعاليات وأنشطة ثقافية لعام 2026" : "Events & Cultural Activities 2026"}
              </h2>
              <div className="flex items-center justify-center gap-3 mt-5">
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#A48E68]" />
                <div className="w-2.5 h-2.5 rotate-45 bg-[#988561] shrink-0 shadow-sm" />
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#A48E68]" />
              </div>
              <p className="text-slate-600 mt-4 max-w-xl mx-auto text-sm md:text-base leading-relaxed font-medium">
                {isRtl 
                  ? "دليلك الكامل للأنشطة والفعاليات الثقافية والفنية في مختلف المحافظات السورية."
                  : "Your comprehensive guide to cultural and artistic events across Syrian governorates."}
              </p>
            </div>

            {calendarContent}

            {/* View Full Calendar button */}
            <div className="text-center mt-12 relative z-10">
              <Link
                href={`/${locale}/calendar`}
                className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#002723] to-[#1C665A] text-[#FBF9F6] font-bold shadow-md hover:shadow-xl hover:from-[#1C665A] hover:to-[#002723] border border-[#A48E68]/30 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <span className="font-qomra text-base tracking-wide font-bold">
                  {isRtl ? "عرض الروزنامة الكاملة" : "View Full Calendar"}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Event Detail Modal ── */}
      {detailEvent && (() => {
        const title = isRtl ? detailEvent.titleAr : (detailEvent.titleEn || detailEvent.titleAr);
        const desc = isRtl ? detailEvent.descriptionAr : (detailEvent.descriptionEn || detailEvent.descriptionAr);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] animate-[scaleIn_0.3s_ease-out]">
              <DecorativeCorners />
              
              {/* Featured Image */}
              <div className="relative aspect-[16/9] w-full bg-slate-100 shrink-0">
                <ImageWithFallback
                  src={detailEvent.featuredImage}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 672px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* Close button */}
                <button
                  onClick={() => setDetailEvent(null)}
                  className="absolute top-4 end-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/85 text-white flex items-center justify-center cursor-pointer transition shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Overlaid Title */}
                <div className="absolute bottom-6 inset-x-6 text-start">
                  <h2 className="text-white font-extrabold text-xl sm:text-2xl font-sans drop-shadow-md">
                    {title}
                  </h2>
                </div>
              </div>

              {/* Scrollable details content */}
              <div className="p-6 overflow-y-auto space-y-6 text-start">
                
                {/* Detailed description */}
                <div>
                  <h4 className="text-xs text-[#A48E68] font-bold uppercase tracking-widest mb-2">
                    {isRtl ? "تفاصيل الفعالية" : "Event details"}
                  </h4>
                  <div 
                    className="text-slate-700 text-sm sm:text-base leading-relaxed font-sans space-y-2 html-content"
                    dangerouslySetInnerHTML={{
                      __html: desc || (isRtl ? "لا يوجد تفاصيل إضافية لهذه الفعالية." : "No additional details available for this event.")
                    }}
                  />
                </div>

                {/* Event attributes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-100 py-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#988561]/10 rounded-xl text-[#988561] border border-[#988561]/20">
                      <IconCalendar />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#A48E68] font-bold uppercase tracking-wider">{isRtl ? "التاريخ" : "Date"}</span>
                      <span className="text-slate-800 text-sm font-semibold mt-0.5">{formatEventDateRange(detailEvent.startDate, detailEvent.endDate, isRtl, false)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#988561]/10 rounded-xl text-[#988561] border border-[#988561]/20">
                      <IconClock />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#A48E68] font-bold uppercase tracking-wider">{isRtl ? "التوقيت" : "Time"}</span>
                      <span className="text-slate-800 text-sm font-semibold mt-0.5">{formatEventTimeRange(detailEvent.startDate, detailEvent.endDate, isRtl)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 sm:col-span-2">
                    <div className="p-2 bg-[#988561]/10 rounded-xl text-[#988561] border border-[#988561]/20">
                      <IconPin />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#A48E68] font-bold uppercase tracking-wider">{isRtl ? "المكان" : "Location"}</span>
                      <span className="text-slate-800 text-sm font-semibold mt-0.5">{formatFullLocation(detailEvent, isRtl)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom buttons */}
                <div className="flex justify-end gap-3 shrink-0 pt-2">
                  {detailEvent.bookingUrl && (
                    <a
                      href={detailEvent.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#054239] hover:bg-[#03332c] text-white text-sm font-bold rounded-full cursor-pointer transition shadow-sm border-b-2 border-[#b9a779]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5Z" />
                      </svg>
                      {isRtl ? "احجز الآن" : "Book now"}
                    </a>
                  )}
                  <button
                    onClick={() => setDetailEvent(null)}
                    className="px-6 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 text-sm font-bold rounded-full cursor-pointer transition"
                  >
                    {isRtl ? "إغلاق" : "Close"}
                  </button>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
