# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Syrian Ministry of Culture (Official Branding)
**Generated:** 2026-05-29 10:53:00
**Category:** Government/Public Service

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#054239` | `--color-primary` |
| Secondary | `#b9a779` | `--color-secondary` |
| CTA/Accent | `#ebb962` | `--color-accent` |
| Background | `#030705` | `--color-background` |
| Text | `#EDE5D6` | `--color-text` |

**Color Notes:** High contrast deep emerald green + luxurious gold + warm sand.

### Typography

- **Heading Font:** ITF Qomra Arabic (Traditional display font)
- **Body Font:** Cairo (Noto Sans Arabic fallback)
- **Mood:** arabic, elegant, traditional, cultural, RTL, readable, premium
- **Google Fonts:** [Cairo](https://fonts.google.com/specimen/Cairo)

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #054239;
  color: #b9a779;
  border: 1px solid #b9a779;
  padding: 12px 24px;
  border-radius: 9999px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  background: #b9a779;
  color: #054239;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #EDE5D6;
  border: 1px solid #EDE5D6;
  padding: 12px 24px;
  border-radius: 9999px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: rgba(237, 229, 214, 0.1);
  transform: translateY(-1px);
}
```

### Cards

```css
.card {
  background: rgba(5, 66, 57, 0.2);
  border: 1px solid rgba(185, 167, 121, 0.15);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: rgba(185, 167, 121, 0.3);
}
```

### Inputs

```css
.input {
  background: rgba(5, 66, 57, 0.1);
  color: #EDE5D6;
  padding: 12px 16px;
  border: 1px solid #b9a779;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #ebb962;
  outline: none;
  box-shadow: 0 0 0 3px rgba(235, 185, 98, 0.2);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(3, 7, 5, 0.7);
  backdrop-filter: blur(6px);
}

.modal {
  background: #054239;
  border: 1px solid #b9a779;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Accessible & Ethical (Traditional Syrian Heritage)

**Keywords:** High contrast, large text (16px+), keyboard navigation, screen reader friendly, WCAG compliant, focus state, semantic, traditional, gold & green

**Best For:** Government, public services, cultural heritage

**Key Effects:** Shimmer gold text effects, smooth transitions (200ms), pulse animations, RTL alignment, vector shape watermarks

---

## Anti-Patterns (Do NOT Use)

- ❌ Ornate design / cluttered patterns
- ❌ Low contrast text / elements
- ❌ Excessively fast/jarring motion effects
- ❌ AI purple/pink gradients
- ❌ Blue/Navy colors (non-official)

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast matches WCAG 4.5:1 minimum (gold/sand on green/black background)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive layout: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
