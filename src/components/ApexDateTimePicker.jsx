"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X, Check } from "lucide-react";

const DAYS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS_AR = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Hour options: 01 to 12
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
// Minute options: 00 to 55 in steps of 5
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export default function ApexDateTimePicker({
  value = "",
  onChange,
  type = "datetime-local", // "date" or "datetime-local"
  isAdmin = false,
  theme = "",
  placeholder = "",
  required = false,
  locale = "ar",
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}) {
  const isRtl = locale === "ar";
  const ref = useRef(null);
  // Separate ref for the popover/sheet card. On mobile the overlay is portaled
  // out to <body> (see below), so it's no longer a DOM descendant of `ref` —
  // the outside-click handler must treat clicks inside it as "inside".
  const popoverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  // Portal-to-body only on mobile, where the overlay is a `position: fixed`
  // bottom sheet. A transformed/animated ancestor (e.g. the copyright form's
  // `animate-fade-in-up`, whose `fill-mode: both` leaves a lingering transform)
  // becomes the containing block for `fixed`, pushing the sheet off-screen.
  // Portaling to <body> escapes that ancestor. Desktop keeps its `md:absolute`
  // popover inline so it stays anchored to the trigger.
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Time selector state
  const [selectedHour, setSelectedHour] = useState("12");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedAmPm, setSelectedAmPm] = useState("PM");
  
  // Jump panels: null, 'month', 'year'
  const [jumpPanel, setJumpPanel] = useState(null);

  // Parse initial value timezone-independently
  useEffect(() => {
    if (!value) {
      setSelectedDate(null);
      return;
    }

    try {
      const valStr = typeof value === "string" ? value : new Date(value).toISOString();
      const match = valStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
      
      if (match) {
        const [_, y, m, d, hr, min] = match;
        const year = parseInt(y, 10);
        const month = parseInt(m, 10) - 1;
        const day = parseInt(d, 10);
        
        // Use local Date constructor at midnight of the matched day
        const localDate = new Date(year, month, day);
        setSelectedDate(localDate);
        setCurrentMonth(localDate);
        
        if (type === "datetime-local" && hr && min) {
          let hrs = parseInt(hr, 10);
          const ampm = hrs >= 12 ? "PM" : "AM";
          hrs = hrs % 12;
          hrs = hrs ? hrs : 12; // 0 converts to 12
          setSelectedHour(String(hrs).padStart(2, "0"));
          
          // Round minutes to nearest 5
          const mins = Math.round(parseInt(min, 10) / 5) * 5;
          setSelectedMinute(String(mins >= 60 ? 0 : mins).padStart(2, "0"));
          setSelectedAmPm(ampm);
        }
      }
    } catch (e) {
      console.error("Error parsing date value:", e);
    }
  }, [value, type]);

  // Handle outside click to close. Clicks inside the trigger OR the (possibly
  // portaled) popover card must NOT close it — only the backdrop / true outside.
  useEffect(() => {
    function handleClickOutside(event) {
      const inTrigger = ref.current && ref.current.contains(event.target);
      const inPopover = popoverRef.current && popoverRef.current.contains(event.target);
      if (!inTrigger && !inPopover) {
        setIsOpen(false);
        setJumpPanel(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format date display value
  const displayValue = useMemo(() => {
    if (!selectedDate) return "";
    
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const year = selectedDate.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    if (type === "datetime-local") {
      const timeStr = `${selectedHour}:${selectedMinute} ${selectedAmPm}`;
      return `${dateStr} ${timeStr}`;
    }
    return dateStr;
  }, [selectedDate, selectedHour, selectedMinute, selectedAmPm, type]);

  // Quick preset actions
  const handlePreset = (presetType) => {
    const today = new Date();
    let target = new Date();

    if (presetType === "today") {
      setSelectedDate(today);
      setCurrentMonth(today);
    } else if (presetType === "tomorrow") {
      target.setDate(today.getDate() + 1);
      setSelectedDate(target);
      setCurrentMonth(target);
    } else if (presetType === "next-week") {
      target.setDate(today.getDate() + 7);
      setSelectedDate(target);
      setCurrentMonth(target);
    } else if (presetType === "clear") {
      setSelectedDate(null);
      onChange("");
      setIsOpen(false);
      return;
    }
    setJumpPanel(null);
  };

  // Month navigation
  const changeMonth = (direction) => {
    const next = new Date(currentMonth);
    next.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(next);
    setJumpPanel(null);
  };

  // Quick jump panel month selection
  const selectMonthJump = (monthIdx) => {
    const next = new Date(currentMonth);
    next.setMonth(monthIdx);
    setCurrentMonth(next);
    setJumpPanel(null);
  };

  // Quick jump panel year selection
  const selectYearJump = (yearVal) => {
    const next = new Date(currentMonth);
    next.setFullYear(yearVal);
    setCurrentMonth(next);
    setJumpPanel(null);
  };

  // Build grid of 42 days for calendar
  const daysGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const lastDayDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const grid = [];
    
    // Prev month days
    for (let i = firstDayIndex; i > 0; i--) {
      const dNum = prevMonthLastDay - i + 1;
      grid.push({
        dayNum: dNum,
        isCurrentMonth: false,
        date: new Date(year, month - 1, dNum)
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayDate; d++) {
      grid.push({
        dayNum: d,
        isCurrentMonth: true,
        date: new Date(year, month, d)
      });
    }

    // Next month days filler to make it 42
    const totalCells = grid.length;
    const nextMonthCells = 42 - totalCells;
    for (let d = 1; d <= nextMonthCells; d++) {
      grid.push({
        dayNum: d,
        isCurrentMonth: false,
        date: new Date(year, month + 1, d)
      });
    }

    return grid;
  }, [currentMonth]);

  // Is date currently selected?
  const isDateSelected = (date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Is date today?
  const isDateToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Confirm and submit selection
  const handleConfirm = () => {
    if (!selectedDate) {
      if (required) {
        alert(isRtl ? "الرجاء اختيار تاريخ أولاً." : "Please select a date first.");
        return;
      }
      onChange("");
      setIsOpen(false);
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");

    if (type === "datetime-local") {
      let hrs = parseInt(selectedHour);
      if (selectedAmPm === "PM" && hrs < 12) hrs += 12;
      if (selectedAmPm === "AM" && hrs === 12) hrs = 0;
      const formattedHour = String(hrs).padStart(2, "0");
      const isoValue = `${year}-${month}-${day}T${formattedHour}:${selectedMinute}`;
      onChange(isoValue);
    } else {
      const isoValue = `${year}-${month}-${day}`;
      onChange(isoValue);
    }
    
    setIsOpen(false);
  };

  // Theme bindings matching official colors
  const resolvedTheme = theme || (isAdmin ? "admin" : "emerald");

  const themeColors = useMemo(() => {
    if (resolvedTheme === "admin") {
      return {
        primaryBg: "bg-[#003D33] hover:bg-[#002B24]",
        primaryGradient: "from-[#003D33] to-[#002B24]",
        accentText: "text-[#003D33]",
        accentBgLight: "bg-[#003D33]/8 text-[#003D33]",
        goldBorder: "border-[#b9a779]",
        goldBg: "bg-[#b9a779] text-[#003D33] hover:bg-[#a59365]",
        goldText: "text-[#b9a779]",
        goldGradient: "from-[#b9a779] to-[#988561]",
        goldTextOnBtn: "text-[#003D33]"
      };
    } else if (resolvedTheme === "crimson") {
      return {
        primaryBg: "bg-[#8B2635] hover:bg-[#732030]",
        primaryGradient: "from-[#8B2635] to-[#6b1e29]",
        accentText: "text-[#8B2635]",
        accentBgLight: "bg-[#8B2635]/8 text-[#8B2635]",
        goldBorder: "border-[#b9a779]",
        goldBg: "bg-[#b9a779] text-[#8B2635] hover:bg-[#a59365]",
        goldText: "text-[#b9a779]",
        goldGradient: "from-[#b9a779] to-[#988561]",
        goldTextOnBtn: "text-[#8B2635]"
      };
    } else {
      // "emerald" default
      return {
        primaryBg: "bg-[#054239] hover:bg-[#04332b]",
        primaryGradient: "from-[#054239] to-[#011d19]",
        accentText: "text-[#054239]",
        accentBgLight: "bg-[#054239]/8 text-[#054239]",
        goldBorder: "border-[#b9a779]",
        goldBg: "bg-[#b9a779] text-[#054239] hover:bg-[#a59365]",
        goldText: "text-[#b9a779]",
        goldGradient: "from-[#b9a779] to-[#988561]",
        goldTextOnBtn: "text-[#054239]"
      };
    }
  }, [resolvedTheme]);

  const currentYear = currentMonth.getFullYear();
  const yearRange = useMemo(() => {
    const range = [];
    const start = currentYear - 10;
    const end = currentYear + 15;
    for (let y = start; y <= end; y++) range.push(y);
    return range;
  }, [currentYear]);

  // CSS class resolution for the input field to match native site inputs
  // Enforce font-cairo instead of font-qomra in RTL to prevent standard numbers (like 1) rendering as Roman/artistic glyphs (like I).
  const inputClass = isAdmin
    ? `w-full rounded-lg border border-gray-200 bg-white py-2 text-sm outline-none transition focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/20 text-slate-800 cursor-pointer shadow-sm ${isRtl ? "font-cairo" : "font-inter"}`
    : `w-full border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/20 rounded-xl py-3.5 text-sm text-slate-800 outline-none transition bg-white placeholder:text-slate-400 cursor-pointer shadow-sm ${isRtl ? "font-cairo" : "font-inter"}`;

  const paddingClass = isRtl ? "pr-4 pl-10" : "pl-4 pr-10";
  const iconPositionClass = isRtl ? "left-3.5" : "right-3.5";

  const overlay = isOpen ? (
        <>
          {/* Mobile backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[99998] md:hidden"
            onClick={() => { setIsOpen(false); setJumpPanel(null); }}
          />

          {/* Premium Picker Dropdown Card: Fixed Bottom Sheet on Mobile, Absolute Popover on Desktop */}
          <div
            ref={popoverRef}
            className={`
              fixed bottom-0 left-0 right-0 w-full rounded-t-3xl rounded-b-none p-6 z-[99999] 
              bg-white/98 backdrop-blur-md border border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]
              max-h-[90vh] overflow-y-auto animate-slide-up
              
              md:absolute md:top-full md:bottom-auto md:left-0 md:right-auto md:w-80 md:rounded-2xl
              md:p-5 md:border md:${themeColors.goldBorder}/30 md:shadow-[0_20px_50px_rgba(0,0,0,0.15),0_0_0_1px_rgba(164,142,104,0.08)]
              md:max-h-none md:overflow-visible md:animate-fade-in-up
              transition-all duration-300 font-cairo
            `}
            style={{ 
              [isRtl ? "right" : "left"]: 0,
              [isRtl ? "left" : "right"]: "auto"
            }}
          >
            {/* Drag Handle Indicator for Mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden shrink-0" />

            {/* Calendar Navigation Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <button 
                type="button" 
                onClick={() => changeMonth(-1)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-[#b9a779]/10 hover:text-slate-800 transition"
              >
                {isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>

              <div className="flex gap-1.5">
                <button 
                  type="button" 
                  onClick={() => setJumpPanel(jumpPanel === "month" ? null : "month")}
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition ${isRtl ? "font-qomra" : "font-inter"} ${themeColors.accentBgLight} hover:bg-[#b9a779]/15`}
                >
                  {isRtl ? MONTHS_AR[currentMonth.getMonth()] : MONTHS_EN[currentMonth.getMonth()]}
                </button>
                <button 
                  type="button" 
                  onClick={() => setJumpPanel(jumpPanel === "year" ? null : "year")}
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition ${isRtl ? "font-qomra" : "font-inter"} ${themeColors.accentBgLight} hover:bg-[#b9a779]/15`}
                >
                  {currentYear}
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => changeMonth(1)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-[#b9a779]/10 hover:text-slate-800 transition"
              >
                {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>

            {/* Quick jump panels */}
            {jumpPanel === "month" && (
              <div className="grid grid-cols-3 gap-2 h-48 overflow-y-auto p-1.5 bg-slate-50/50 rounded-xl border border-slate-100 mb-3">
                {MONTHS_AR.map((mName, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectMonthJump(idx)}
                    className={`text-xs font-bold py-2.5 px-1 rounded-lg transition ${isRtl ? "font-qomra" : "font-inter"} ${
                      idx === currentMonth.getMonth() ? themeColors.goldBg : "text-slate-655 hover:bg-slate-100"
                    }`}
                  >
                    {isRtl ? mName : MONTHS_EN[idx].substring(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {jumpPanel === "year" && (
              <div className="grid grid-cols-4 gap-1.5 h-48 overflow-y-auto p-1.5 bg-slate-50/50 rounded-xl border border-slate-100 mb-3">
                {yearRange.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => selectYearJump(yr)}
                    className={`text-xs font-bold py-2.5 rounded-lg transition font-cairo ${
                      yr === currentMonth.getFullYear() ? themeColors.goldBg : "text-slate-655 hover:bg-slate-100"
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}

            {/* Main Calendar Section (Only visible when no jump panels are active) */}
            {!jumpPanel && (
              <>
                {/* Weekdays Header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {(isRtl ? DAYS_AR : DAYS_EN).map((d) => (
                    <span key={d} className={`text-[11px] font-extrabold ${themeColors.goldText} py-1 opacity-95 ${isRtl ? "font-qomra" : "font-inter"}`}>
                      {d}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {daysGrid.map((cell, idx) => {
                    const isSelected = isDateSelected(cell.date);
                    const isToday = isDateToday(cell.date);
                    const isCurrent = cell.isCurrentMonth;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(cell.date)}
                        className={`
                          aspect-square text-xs rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer min-h-[38px] md:min-h-0 font-cairo
                          ${isSelected ? `bg-gradient-to-br ${themeColors.primaryGradient} text-white font-extrabold scale-105 shadow-md` : ""}
                          ${!isSelected && isToday ? `border border-[#b9a779] ${themeColors.accentText} font-extrabold bg-[#b9a779]/5` : ""}
                          ${!isSelected && !isToday && isCurrent ? "text-slate-700 hover:bg-[#b9a779]/12" : ""}
                          ${!isSelected && !isCurrent ? "text-slate-300" : ""}
                        `}
                      >
                        {cell.dayNum}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Time Selector for datetime-local */}
            {type === "datetime-local" && !jumpPanel && (
              <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3.5">
                <span className={`text-xs font-bold ${themeColors.accentText} flex items-center gap-1`}>
                  <Clock className="w-4.5 h-4.5 text-[#b9a779]" />
                  {isRtl ? "الوقت" : "Time"}
                </span>

                <div className="flex items-center gap-1.5 font-cairo" dir="ltr">
                  {/* Hours select */}
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none transition focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/20 font-cairo"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-xs font-bold">:</span>
                  
                  {/* Minutes select */}
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none transition focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/20 font-cairo"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {/* AM / PM toggle */}
                  <button
                    type="button"
                    onClick={() => setSelectedAmPm(selectedAmPm === "AM" ? "PM" : "AM")}
                    className="rounded-lg px-3 py-1.5 text-xs font-extrabold transition ml-1 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    {selectedAmPm}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Presets Bar */}
            {!jumpPanel && (
              <div className="flex flex-wrap gap-1 mt-4 pt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handlePreset("today")}
                  className={`rounded-lg border border-[#b9a779]/15 px-3 py-2 text-[10px] font-bold bg-white text-slate-655 hover:bg-[#b9a779]/8 hover:border-[#b9a779]/45 hover:text-slate-800 transition cursor-pointer ${isRtl ? "font-qomra" : "font-inter"}`}
                >
                  {isRtl ? "اليوم" : "Today"}
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("tomorrow")}
                  className={`rounded-lg border border-[#b9a779]/15 px-3 py-2 text-[10px] font-bold bg-white text-slate-655 hover:bg-[#b9a779]/8 hover:border-[#b9a779]/45 hover:text-slate-800 transition cursor-pointer ${isRtl ? "font-qomra" : "font-inter"}`}
                >
                  {isRtl ? "غداً" : "Tomorrow"}
                </button>
                {type === "datetime-local" && (
                  <button
                    type="button"
                    onClick={() => handlePreset("next-week")}
                    className={`rounded-lg border border-[#b9a779]/15 px-3 py-2 text-[10px] font-bold bg-white text-slate-655 hover:bg-[#b9a779]/8 hover:border-[#b9a779]/45 hover:text-slate-800 transition cursor-pointer ${isRtl ? "font-qomra" : "font-inter"}`}
                  >
                    {isRtl ? "الأسبوع القادم" : "Next Week"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePreset("clear")}
                  className={`rounded-lg border border-red-200 px-3 py-2 text-[10px] font-bold bg-red-50/50 text-red-650 hover:bg-red-100 hover:text-red-700 transition cursor-pointer ml-auto ${isRtl ? "font-qomra" : "font-inter"}`}
                >
                  {isRtl ? "مسح" : "Clear"}
                </button>
              </div>
            )}

            {/* Confirm / Close Footer Buttons */}
            <div className="flex gap-2 mt-4 pt-3.5 border-t border-slate-100 justify-end">
              <button
                type="button"
                onClick={() => { setIsOpen(false); setJumpPanel(null); }}
                className={`rounded-lg px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer flex items-center justify-center gap-1 flex-1 md:flex-initial ${isRtl ? "font-qomra" : "font-inter"}`}
              >
                <X className="w-4.5 h-4.5" />
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`rounded-lg px-5 py-2.5 text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1 bg-gradient-to-r ${themeColors.goldGradient} ${themeColors.goldTextOnBtn} hover:brightness-110 shadow-sm flex-1 md:flex-initial ${isRtl ? "font-qomra" : "font-inter"}`}
              >
                <Check className="w-4.5 h-4.5" />
                {isRtl ? "تأكيد" : "Confirm"}
              </button>
            </div>

          </div>
        </>
  ) : null;

  return (
    <div className="relative w-full" ref={ref} dir={isRtl ? "rtl" : "ltr"}>
      {/* Visible Interactive Input Field */}
      <div className="relative flex items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <input
          id={id}
          type="text"
          readOnly
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          placeholder={placeholder || (type === "datetime-local" ?
            (isRtl ? "اختر التاريخ والوقت..." : "Select date and time...") :
            (isRtl ? "اختر التاريخ..." : "Select date..."))}
          value={displayValue}
          required={required}
          className={`${inputClass} ${paddingClass}`}
          style={{
            direction: displayValue ? "ltr" : (isRtl ? "rtl" : "ltr"),
            textAlign: isRtl ? "right" : "left"
          }}
        />
        <CalendarIcon className={`absolute ${iconPositionClass} w-4.5 h-4.5 text-slate-450 pointer-events-none transition-transform duration-200`} />
      </div>

      {/* On mobile, portal the fixed bottom-sheet overlay to <body> so a
          transformed ancestor can't break its positioning. On desktop the
          `md:absolute` popover stays inline, anchored to this trigger. */}
      {isMobile && mounted ? createPortal(overlay, document.body) : overlay}
    </div>
  );
}
