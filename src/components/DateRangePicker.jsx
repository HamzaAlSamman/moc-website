"use client";

import React, { useState, useRef, useEffect } from "react";

const DAYS_AR = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
const DAYS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Week starts Saturday (JS day 6 = Sat)
// Map JS getDay() → column index (0=Sat … 6=Fri)
const DAY_COL = [1, 2, 3, 4, 5, 6, 0]; // Sun=1,Mon=2,...Sat=0

function startOf(d) {
  const c = new Date(d); c.setHours(0,0,0,0); return c;
}
function isSameDay(a, b) {
  return a && b && startOf(a).getTime() === startOf(b).getTime();
}
function inRange(d, s, e) {
  if (!s || !e) return false;
  const t = startOf(d).getTime();
  return t > startOf(s).getTime() && t < startOf(e).getTime();
}

function buildGrid(year, month) {
  const days = [];
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startCol = DAY_COL[first.getDay()];
  for (let i = 0; i < startCol; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function MonthGrid({ year, month, startDate, endDate, hovered, onDay, onHover, locale = "ar" }) {
  const today = startOf(new Date());
  const grid  = buildGrid(year, month);
  const isRtl = locale === "ar";
  const daysHeader = isRtl ? DAYS_AR : DAYS_EN;

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {daysHeader.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;

          const isStart   = isSameDay(d, startDate);
          const isEnd     = isSameDay(d, endDate);
          const isToday   = isSameDay(d, today);
          const rangeEnd  = endDate || hovered;
          const inRng     = startDate && !isStart && inRange(d, startDate, rangeEnd);
          const isHovEnd  = !endDate && isSameDay(d, hovered);

          return (
            <div
              key={i}
              className={`
                relative flex items-center justify-center h-8 text-sm cursor-pointer select-none
                transition-colors duration-100
                ${inRng ? "bg-[#002723]/10" : ""}
                ${isStart ? "rounded-s-full" : ""}
                ${isEnd || isHovEnd ? "rounded-e-full" : ""}
              `}
              onMouseEnter={() => onHover(d)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onDay(d)}
            >
              <span className={`
                z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                transition-all duration-100
                ${isStart || isEnd ? "bg-[#002723] text-white font-bold" : ""}
                ${isHovEnd && !isEnd ? "bg-[#002723]/20 text-[#002723]" : ""}
                ${isToday && !isStart && !isEnd ? "ring-2 ring-[#A48E68] text-[#002723] font-bold" : ""}
                ${!isStart && !isEnd && !isHovEnd ? "hover:bg-slate-100 text-slate-700" : ""}
              `}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({ value, onChange, locale = "ar" }) {
  const isRtl = locale === "ar";
  const today = new Date();

  const [open,      setOpen]      = useState(false);
  const [leftYear,  setLeftYear]  = useState(today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(today.getMonth());
  const [startDate, setStartDate] = useState(value?.start || null);
  const [endDate,   setEndDate]   = useState(value?.end   || null);
  const [hovered,   setHovered]   = useState(null);
  const ref = useRef(null);

  // Right month = left + 1
  const rightMonth = leftMonth === 11 ? 0  : leftMonth + 1;
  const rightYear  = leftMonth === 11 ? leftYear + 1 : leftYear;

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleDay(d) {
    if (!startDate || (startDate && endDate)) {
      setStartDate(d); setEndDate(null);
    } else {
      if (d < startDate) { setStartDate(d); setEndDate(null); }
      else                { setEndDate(d); }
    }
  }

  function prev() {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear(y => y - 1); }
    else                  { setLeftMonth(m => m - 1); }
  }
  function next() {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear(y => y + 1); }
    else                   { setLeftMonth(m => m + 1); }
  }

  function apply() {
    if (startDate) { onChange({ start: startDate, end: endDate || startDate }); }
    setOpen(false);
  }
  function reset() {
    setStartDate(null); setEndDate(null);
    onChange({ start: null, end: null });
    setOpen(false);
  }

  const hasValue = value?.start;
  const dateLocale = isRtl ? "ar-SY" : "en-US";
  const label = hasValue
    ? `${value.start.toLocaleDateString(dateLocale)}${value.end && !isSameDay(value.start, value.end) ? " — " + value.end.toLocaleDateString(dateLocale) : ""}`
    : (isRtl ? "تصفية بالتاريخ" : "Filter by date");

  return (
    <div className="relative w-full sm:w-auto" ref={ref} dir={isRtl ? "rtl" : "ltr"}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          w-full sm:w-auto justify-center sm:justify-start flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold
          transition-all duration-200
          ${hasValue
            ? "bg-[#002723] text-white border-[#002723]"
            : "bg-white/10 text-white border-[#b9a779]/50 hover:border-[#b9a779] hover:bg-white/15 backdrop-blur-sm"
          }
        `}
      >
        {/* Calendar icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="inline">{label}</span>
        {hasValue && (
          <span
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs leading-none"
          >×</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-[340px] sm:w-[620px] max-w-[calc(100vw-2rem)]"
          style={{ [isRtl ? "left" : "right"]: 0 }}>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prev}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600">
              ‹
            </button>
            <div className="flex-1 hidden sm:grid grid-cols-2 text-center">
              <span className="text-sm font-bold text-[#002723]">
                {isRtl ? `${MONTHS_AR[leftMonth]} ${leftYear}` : `${MONTHS_EN[leftMonth]} ${leftYear}`}
              </span>
              <span className="text-sm font-bold text-[#002723]">
                {isRtl ? `${MONTHS_AR[rightMonth]} ${rightYear}` : `${MONTHS_EN[rightMonth]} ${rightYear}`}
              </span>
            </div>
            {/* Mobile: show one month */}
            <div className="flex-1 sm:hidden text-center">
              <span className="text-sm font-bold text-[#002723]">
                {isRtl ? `${MONTHS_AR[leftMonth]} ${leftYear}` : `${MONTHS_EN[leftMonth]} ${leftYear}`}
              </span>
            </div>
            <button onClick={next}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600">
              ›
            </button>
          </div>

          {/* Calendars */}
          <div className="flex gap-6">
            <div className="flex-1">
              <MonthGrid
                year={leftYear} month={leftMonth}
                startDate={startDate} endDate={endDate}
                hovered={hovered}
                onDay={handleDay} onHover={setHovered}
                locale={locale}
              />
            </div>
            <div className="flex-1 hidden sm:block">
              <MonthGrid
                year={rightYear} month={rightMonth}
                startDate={startDate} endDate={endDate}
                hovered={hovered}
                onDay={handleDay} onHover={setHovered}
                locale={locale}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {startDate && !endDate ? (isRtl ? "اختر تاريخ النهاية" : "Pick end date") : ""}
            </span>
            <div className="flex gap-2">
              <button onClick={reset}
                className="px-4 py-1.5 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                {isRtl ? "إعادة تعيين" : "Reset"}
              </button>
              <button onClick={apply}
                disabled={!startDate}
                className="px-5 py-1.5 rounded-full bg-[#002723] text-white text-sm font-semibold hover:bg-[#002723]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {isRtl ? "تطبيق" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
