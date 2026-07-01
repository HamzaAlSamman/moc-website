# ApexDateTimePicker: Integration Guide & Blueprint
### The Premium, Zero-Dependency Date-Time Picker for Multilingual Web Apps

This blueprint contains the complete HTML, CSS, and JavaScript code required to implement the custom **ApexDateTimePicker** component. It is designed to be copy-paste ready and simple for any developer or AI to integrate into any web project.

---

## 📌 Why ApexDateTimePicker?
When a browser's UI language is set to Arabic, Chromium forces native `<input type="datetime-local">` fields to render in RTL format, causing:
1. **Scrambled Placeholders:** The default browser placeholder breaks into scrambled characters (e.g. `قنس/رهش/موي` instead of `يوم/شهر/سنة`).
2. **Digit Reversal:** Typing values like `28` displays as `82` or `٨٢` as `٢٨`.
3. **Inconsistent Locales:** Browser locale settings override input code, forcing Arabic-Indic numerals (`٠-٩`) when Western numerals (`0-9`) are required.

**ApexDateTimePicker** solves this by using a standard `<input type="text">` styled to look like a premium picker, synchronized with a hidden native input. It is fully responsive, supports bilingual page layouts, provides a gorgeous glassmorphism UI, and enforces correct English digits.

---

## 🛠️ Step 1: HTML Markup
Place this structure inside your form. The visible text field handles displaying the formatted date in LTR Western digits, while the hidden input stores the standard ISO format (`YYYY-MM-DDTHH:MM`) needed for backend form submissions.

```html
<!-- Wrapper for the custom date-time picker -->
<div class="apex-picker-wrapper">
  <div class="apex-picker-input-container">
    <!-- Visible LTR text field (user interaction) -->
    <input type="text" id="custom-picker-input" class="apex-picker-input" placeholder="Select date and time..." readonly>
    
    <!-- Calendar SVG Icon -->
    <svg class="apex-picker-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    
    <!-- Hidden input synced with backend standard ISO value (e.g. 2026-06-15T22:30) -->
    <input type="hidden" id="custom-picker-hidden-input" name="selected_datetime">
  </div>
</div>
```

---

## 🎨 Step 2: CSS Styling
Add this CSS to your global stylesheet. It defines the layout, fonts, colors, animations, quick selection menus, and handles responsive adjustments (mobile bottom sheet + frosted blur background overlay).

```css
/* ==========================================================================
   ApexDateTimePicker Premium Stylesheet
   ========================================================================== */

:root {
  --apex-primary: #4f46e5;
  --apex-primary-hover: #4338ca;
  --apex-bg-dropdown: rgba(255, 255, 255, 0.95);
  --apex-text-main: #1e293b;
  --apex-text-muted: #64748b;
  --apex-border: #cbd5e1;
  --apex-font: 'Outfit', 'Tajawal', sans-serif;
}

.apex-picker-wrapper {
  position: relative;
  width: 100%;
  max-width: 360px;
  display: inline-block;
  font-family: var(--apex-font);
}

.apex-picker-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.apex-picker-input {
  width: 100%;
  padding: 12px 16px 12px 46px; /* Space for left icon */
  font-size: 15px;
  font-weight: 500;
  color: var(--apex-text-main);
  background-color: #ffffff;
  border: 1.5px solid var(--apex-border);
  border-radius: 10px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  direction: ltr !important;
  text-align: left !important;
}

.apex-picker-input:focus, .apex-picker-input.active {
  border-color: var(--apex-primary);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
}

.apex-picker-icon {
  position: absolute;
  left: 14px;
  color: var(--apex-primary);
  width: 20px;
  height: 20px;
  pointer-events: none;
  transition: transform 0.2s ease;
}

.apex-picker-input:focus + .apex-picker-icon,
.apex-picker-input.active + .apex-picker-icon {
  transform: scale(1.1);
}

/* --- Floating Dropdown Card (Glassmorphism) --- */
.apex-picker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 1000;
  width: 340px;
  background: var(--apex-bg-dropdown);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(79, 70, 229, 0.15);
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 
              0 20px 48px -10px rgba(79, 70, 229, 0.12);
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transform-origin: top left;
  animation: apexPickerShow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  direction: ltr !important;
}

@keyframes apexPickerShow {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* --- Navigation Header --- */
.apex-cal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.apex-cal-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.apex-cal-month-btn, .apex-cal-year-btn {
  background: #f1f5f9;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--apex-text-main);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.apex-cal-month-btn:hover, .apex-cal-year-btn:hover {
  background: #e2e8f0;
  color: var(--apex-primary);
}

.apex-cal-nav-btn {
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: var(--apex-text-muted);
  transition: all 0.2s;
}

.apex-cal-nav-btn:hover {
  background: #f1f5f9;
  color: var(--apex-primary);
}

/* --- Month/Year Selection Grids (Quick Jumper) --- */
.apex-jump-panel {
  position: relative;
  margin-top: 10px;
  background: #ffffff;
  border-radius: 12px;
  z-index: 10;
  display: grid;
  padding: 10px;
  box-sizing: border-box;
  box-shadow: inset 0 0 8px rgba(0,0,0,0.02);
  border: 1px solid #e2e8f0;
  height: 280px; /* Consistent height prevents container collapse */
}

.apex-month-jump-grid {
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.apex-year-jump-grid {
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  overflow-y: auto;
}

.apex-jump-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.apex-jump-cell:hover {
  background: #eeefff;
  color: var(--apex-primary);
}

.apex-jump-cell.active {
  background: var(--apex-primary);
  color: #ffffff;
  font-weight: 600;
}

/* --- Weekdays --- */
.apex-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 4px;
}

/* --- Days Grid --- */
.apex-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.apex-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #334155;
  user-select: none;
}

.apex-day.muted {
  color: #cbd5e1;
}

.apex-day:hover:not(.muted) {
  background: #f1f5f9;
  color: var(--apex-primary);
}

.apex-day.today {
  border: 1.5px solid #818cf8;
  color: var(--apex-primary);
  font-weight: 700;
}

.apex-day.selected {
  background: var(--apex-primary) !important;
  color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

/* --- Quick Presets Bar --- */
.apex-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.apex-preset-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Tajawal', sans-serif;
}

.apex-preset-btn:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: var(--apex-primary);
}

/* --- Time Selection --- */
.apex-time-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.apex-time-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Tajawal', sans-serif;
}

.apex-time-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.apex-time-select {
  padding: 6px 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--apex-text-main);
  background-color: #ffffff;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  font-family: 'Outfit', sans-serif;
}

.apex-time-select:focus {
  border-color: var(--apex-primary);
}

/* --- Footer Controls --- */
.apex-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.apex-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  outline: none;
  font-family: 'Tajawal', sans-serif;
}

.apex-btn-cancel {
  background: #f1f5f9;
  border: none;
  color: #64748b;
}

.apex-btn-cancel:hover {
  background: #e2e8f0;
  color: #475569;
}

.apex-btn-confirm {
  background: var(--apex-primary);
  border: none;
  color: #ffffff;
}

.apex-btn-confirm:hover {
  background: var(--apex-primary-hover);
}

/* --- Mobile Blur Backdrop Overlay --- */
.apex-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 9999;
  animation: apexFadeIn 0.25s ease;
}

@keyframes apexFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* --- Mobile Responsiveness (Bottom Sheet Modal Drawer) --- */
@media (max-width: 480px) {
  .apex-picker-dropdown {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.1);
    transform-origin: bottom center;
    animation: slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 10000 !important;
  }
  
  @keyframes slideUpMobile {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
}
```

---

## 🧠 Step 3: JavaScript Class
Include this script block in your footer or JS module file. It instantiates the `ApexDateTimePicker` class, managing selection grids, calendar offsets, preset times, responsive DOM insertion to bypass blur bugs, and keyboard triggers.

```javascript
class ApexDateTimePicker {
  constructor(inputElement, hiddenElement) {
    this.input = inputElement;
    this.hiddenInput = hiddenElement;
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.selectedTime = { hour: '12', minute: '00', ampm: 'PM' };
    this.activePanel = null; // 'month' or 'year' or null
    this.init();
  }

  init() {
    this.wrapper = this.input.closest('.apex-picker-wrapper');
    
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'apex-picker-dropdown';
    this.dropdown.style.display = 'none';
    this.wrapper.appendChild(this.dropdown);
    
    // Set default selection matching current time
    const now = new Date();
    let hrs = now.getHours();
    let ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // 0 hour converts to 12
    this.selectedTime.hour = hrs < 10 ? '0' + hrs : '' + hrs;
    
    let mins = Math.round(now.getMinutes() / 5) * 5;
    if (mins >= 60) {
      mins = 0;
    }
    this.selectedTime.minute = mins < 10 ? '0' + mins : '' + mins;
    this.selectedTime.ampm = ampm;

    // Click input to toggle picker
    this.input.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // Close when clicking outside picker
    document.addEventListener('click', (e) => {
      if (!this.wrapper.contains(e.target)) {
        this.close();
      }
    });

    this.render();
  }

  toggle() {
    if (this.dropdown.style.display === 'none') {
      this.open();
    } else {
      this.close();
    }
  }

  open() {
    // Close other picker instances
    document.querySelectorAll('.apex-picker-dropdown').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.apex-picker-input').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.apex-picker-overlay').forEach(o => o.remove());
    
    // Check mobile screens: append to body directly to bypass container blur / z-index inheritance
    if (window.innerWidth <= 480) {
      document.body.appendChild(this.dropdown);
      
      this.overlay = document.createElement('div');
      this.overlay.className = 'apex-picker-overlay';
      document.body.appendChild(this.overlay);
      this.overlay.addEventListener('click', () => this.close());
    } else {
      this.wrapper.appendChild(this.dropdown);
    }
    
    this.dropdown.style.display = 'flex';
    this.input.classList.add('active');
    this.activePanel = null;
    this.render();
  }

  close() {
    this.dropdown.style.display = 'none';
    this.input.classList.remove('active');
    this.activePanel = null;
    
    // Remove blur overlay
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    document.querySelectorAll('.apex-picker-overlay').forEach(o => o.remove());
  }

  changeMonth(dir) {
    this.currentDate.setMonth(this.currentDate.getMonth() + dir);
    this.activePanel = null;
    this.render();
  }

  selectPreset(type) {
    const target = new Date();
    if (type === 'today') {
      this.selectedDate = target;
      this.currentDate = new Date(target);
    } else if (type === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      this.selectedDate = target;
      this.currentDate = new Date(target);
    } else if (type === 'next-week') {
      target.setDate(target.getDate() + 7);
      this.selectedDate = target;
      this.currentDate = new Date(target);
    } else if (type === 'clear') {
      this.selectedDate = null;
      this.input.value = '';
      if (this.hiddenInput) this.hiddenInput.value = '';
      this.close();
      return;
    }
    this.render();
  }

  toggleMonthJump() {
    this.activePanel = this.activePanel === 'month' ? null : 'month';
    this.render();
  }

  toggleYearJump() {
    this.activePanel = this.activePanel === 'year' ? null : 'year';
    this.render();
  }

  selectMonth(m) {
    this.currentDate.setMonth(m);
    this.activePanel = null;
    this.render();
  }

  selectYear(y) {
    this.currentDate.setFullYear(y);
    this.activePanel = null;
    this.render();
  }

  confirm() {
    if (!this.selectedDate) {
      alert('Please select a date.');
      return;
    }
    
    // Translate displayed hours to 24hr format for hidden native compatibility
    let displayHour = parseInt(this.selectedTime.hour);
    let isPM = this.selectedTime.ampm === 'PM';
    let hour24 = displayHour;
    if (isPM && displayHour < 12) hour24 += 12;
    if (!isPM && displayHour === 12) hour24 = 0;
    
    const day = this.selectedDate.getDate();
    const month = this.selectedDate.getMonth() + 1;
    const year = this.selectedDate.getFullYear();
    
    const pad = (n) => n < 10 ? '0' + n : n;
    
    // Set English digits LTR layout to prevent browser locale substitution
    const formattedDate = `${pad(day)}/${pad(month)}/${year}`;
    const formattedTime = `${this.selectedTime.hour}:${this.selectedTime.minute} ${this.selectedTime.ampm}`;
    this.input.value = `${formattedDate} ${formattedTime}`;
    
    // Set value of hidden input field (ISO standard format)
    if (this.hiddenInput) {
      this.hiddenInput.value = `${year}-${pad(month)}-${pad(day)}T${pad(hour24)}:${pad(this.selectedTime.minute)}`;
    }
    
    this.close();
  }

  render() {
    this.dropdown.innerHTML = '';
    
    // 1. Navigation Header
    const header = document.createElement('div');
    header.className = 'apex-cal-header';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'apex-cal-nav-btn';
    prevBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    `;
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.changeMonth(-1); });
    
    const titleWrap = document.createElement('div');
    titleWrap.className = 'apex-cal-title-wrap';
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = months[this.currentDate.getMonth()];
    const currentYear = this.currentDate.getFullYear();
    
    const monthBtn = document.createElement('button');
    monthBtn.className = 'apex-cal-month-btn';
    monthBtn.textContent = currentMonthName;
    monthBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMonthJump(); });
    
    const yearBtn = document.createElement('button');
    yearBtn.className = 'apex-cal-year-btn';
    yearBtn.textContent = currentYear;
    yearBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleYearJump(); });
    
    titleWrap.appendChild(monthBtn);
    titleWrap.appendChild(yearBtn);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'apex-cal-nav-btn';
    nextBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    `;
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.changeMonth(1); });
    
    header.appendChild(prevBtn);
    header.appendChild(titleWrap);
    header.appendChild(nextBtn);
    this.dropdown.appendChild(header);

    // Month Quick Selection Grid
    if (this.activePanel === 'month') {
      const jumpPanel = document.createElement('div');
      jumpPanel.className = 'apex-jump-panel apex-month-jump-grid';
      months.forEach((mName, idx) => {
        const cell = document.createElement('div');
        cell.className = `apex-jump-cell ${idx === this.currentDate.getMonth() ? 'active' : ''}`;
        cell.textContent = mName.substring(0, 3);
        cell.addEventListener('click', (e) => { e.stopPropagation(); this.selectMonth(idx); });
        jumpPanel.appendChild(cell);
      });
      this.dropdown.appendChild(jumpPanel);
      return;
    }
    
    // Year Quick Selection Grid
    if (this.activePanel === 'year') {
      const jumpPanel = document.createElement('div');
      jumpPanel.className = 'apex-jump-panel apex-year-jump-grid';
      const startYear = this.currentDate.getFullYear() - 10;
      const endYear = this.currentDate.getFullYear() + 15;
      for (let y = startYear; y <= endYear; y++) {
        const cell = document.createElement('div');
        cell.className = `apex-jump-cell ${y === this.currentDate.getFullYear() ? 'active' : ''}`;
        cell.textContent = y;
        cell.addEventListener('click', (e) => { e.stopPropagation(); this.selectYear(y); });
        jumpPanel.appendChild(cell);
      }
      this.dropdown.appendChild(jumpPanel);
      setTimeout(() => {
        const activeCell = jumpPanel.querySelector('.apex-jump-cell.active');
        if (activeCell) activeCell.scrollIntoView({ block: 'center' });
      }, 10);
      return;
    }

    // 2. Weekdays Header
    const weekdaysWrap = document.createElement('div');
    weekdaysWrap.className = 'apex-weekdays';
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(w => {
      const wEl = document.createElement('div');
      wEl.textContent = w;
      weekdaysWrap.appendChild(wEl);
    });
    this.dropdown.appendChild(weekdaysWrap);

    // 3. Dynamic Days Grid (42 Cells Total)
    const daysGrid = document.createElement('div');
    daysGrid.className = 'apex-days-grid';
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Fill in previous month days (Muted filler)
    for (let i = firstDayIndex; i > 0; i--) {
      const dNum = prevMonthLastDay - i + 1;
      const dayEl = document.createElement('div');
      dayEl.className = 'apex-day muted';
      dayEl.textContent = dNum;
      daysGrid.appendChild(dayEl);
    }
    
    // Fill in current month active days
    const today = new Date();
    for (let d = 1; d <= lastDayDate; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const isSelected = this.selectedDate && this.selectedDate.getDate() === d && this.selectedDate.getMonth() === month && this.selectedDate.getFullYear() === year;
      
      const dayEl = document.createElement('div');
      dayEl.className = `apex-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
      dayEl.textContent = d;
      dayEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedDate = new Date(year, month, d);
        this.render();
      });
      daysGrid.appendChild(dayEl);
    }
    
    // Fill in next month days (Muted filler)
    const totalCells = firstDayIndex + lastDayDate;
    const nextMonthCells = 42 - totalCells;
    for (let d = 1; d <= nextMonthCells; d++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'apex-day muted';
      dayEl.textContent = d;
      daysGrid.appendChild(dayEl);
    }
    
    this.dropdown.appendChild(daysGrid);

    // 4. Presets Panel
    const presetsWrap = document.createElement('div');
    presetsWrap.className = 'apex-presets';
    
    const presets = [
      { label: 'اليوم', type: 'today' },
      { label: 'غداً', type: 'tomorrow' },
      { label: 'الأسبوع القادم', type: 'next-week' },
      { label: 'مسح', type: 'clear' }
    ];
    
    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'apex-preset-btn';
      btn.textContent = p.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectPreset(p.type);
      });
      presetsWrap.appendChild(btn);
    });
    this.dropdown.appendChild(presetsWrap);

    // 5. Time Select Section
    const timeWrap = document.createElement('div');
    timeWrap.className = 'apex-time-wrap';
    
    const timeLabel = document.createElement('div');
    timeLabel.className = 'apex-time-label';
    timeLabel.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>الوقت</span>
    `;
    
    const timeInputs = document.createElement('div');
    timeInputs.className = 'apex-time-inputs';
    
    // Hour Wheel Select
    const hrSelect = document.createElement('select');
    hrSelect.className = 'apex-time-select';
    for (let i = 1; i <= 12; i++) {
      const val = i < 10 ? '0' + i : '' + i;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      if (val === this.selectedTime.hour) opt.selected = true;
      hrSelect.appendChild(opt);
    }
    hrSelect.addEventListener('change', (e) => { this.selectedTime.hour = e.target.value; });
    
    const colon = document.createElement('span');
    colon.textContent = ':';
    colon.style.fontWeight = 'bold';
    
    // Minute Wheel Select (5-minute step intervals)
    const minSelect = document.createElement('select');
    minSelect.className = 'apex-time-select';
    for (let i = 0; i < 60; i += 5) {
      const val = i < 10 ? '0' + i : '' + i;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      if (val === this.selectedTime.minute) opt.selected = true;
      minSelect.appendChild(opt);
    }
    minSelect.addEventListener('change', (e) => { this.selectedTime.minute = e.target.value; });
    
    // AM/PM Select
    const ampmSelect = document.createElement('select');
    ampmSelect.className = 'apex-time-select';
    ['AM', 'PM'].forEach(ap => {
      const opt = document.createElement('option');
      opt.value = ap;
      opt.textContent = ap;
      if (ap === this.selectedTime.ampm) opt.selected = true;
      ampmSelect.appendChild(opt);
    });
    ampmSelect.addEventListener('change', (e) => { this.selectedTime.ampm = e.target.value; });
    
    timeInputs.appendChild(hrSelect);
    timeInputs.appendChild(colon);
    timeInputs.appendChild(minSelect);
    timeInputs.appendChild(ampmSelect);
    
    timeWrap.appendChild(timeLabel);
    timeWrap.appendChild(timeInputs);
    this.dropdown.appendChild(timeWrap);

    // 6. Action Footer Buttons
    const footer = document.createElement('div');
    footer.className = 'apex-footer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'apex-btn apex-btn-cancel';
    cancelBtn.textContent = 'إلغاء';
    cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'apex-btn apex-btn-confirm';
    confirmBtn.textContent = 'تأكيد';
    confirmBtn.addEventListener('click', (e) => { e.stopPropagation(); this.confirm(); });
    
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    this.dropdown.appendChild(footer);
  }
}
```

---

## 🚀 Step 4: Instantiation
To load the component on any target input, invoke it by passing the DOM elements (the visible target text input and the hidden output input).

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const customInput = document.getElementById('custom-picker-input');
  const customHiddenInput = document.getElementById('custom-picker-hidden-input');
  
  if (customInput && customHiddenInput) {
    new ApexDateTimePicker(customInput, customHiddenInput);
  }
});
```

---

## 🤖 AI Integration Rules (For Sub-Agents and Code Generators)
When writing scripts to automate this installation on a new form or codebase, follow these rules:
1. **Target Identification:** Swap `<input type="datetime-local">` with the Wrapper container block (HTML Markup section). Ensure `id` and `name` attributes match the project's original input schema.
2. **Class Isolation:** Do not copy the styles inside tag selectors (`input {}`). Ensure styles are scoped inside `.apex-picker-input` and `.apex-picker-dropdown` to avoid breaking other inputs in the system.
3. **No External Dependancies:** Do not try to install or request NPM packages or CDN resources. The code provided is fully self-sufficient and works 100% offline.
4. **Stacking Context Check:** If the input lies inside an animated parent or card (like modally popped drawers or translated sections), ensure that on mobile screens (`window.innerWidth <= 480`), the dropdown and overlay are appended to `document.body` directly (as implemented in the `open()` method).
5. **Digit Guarding:** Always verify that the input class attributes contain `direction: ltr !important;` and `text-align: left !important;` to guard against automatic browser-forced Arabic locale digit substitutions.
