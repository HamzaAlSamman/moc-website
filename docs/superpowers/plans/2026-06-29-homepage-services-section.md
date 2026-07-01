# Homepage Services Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a professional homepage services section after news and remove the small gallery overlay icon from achievements images.

**Architecture:** Create one focused client-compatible React component for homepage service cards, then render it in the existing locale homepage after `NewsSection`. Keep the achievements change scoped to the existing achievements component by removing only the decorative overlay icon markup.

**Tech Stack:** Next.js App Router 16.2.6, React 19.2.4, Tailwind CSS 4, local project components.

## Global Constraints

- The services section appears after the news section and before the cultural calendar section.
- The cards appear in this exact order: internal oversight complaints, event submission, international cooperation.
- The first service card is visually emphasized in a restrained way.
- Every service link and the "عرض جميع الخدمات" link include the current locale.
- Remove only the small gallery/photos overlay icon from achievements images without changing achievements content, image behavior, or links.
- Follow the project's Next.js docs under `node_modules/next/dist/docs/` before changing App Router code.

---

### Task 1: Add Static Coverage For Homepage Services

**Files:**
- Create: `scripts/check-homepage-services-section.mjs`
- Verify: `src/components/HomeServicesSection.jsx`
- Verify: `src/app/[locale]/page.js`

**Interfaces:**
- Consumes: expected source files as plain text.
- Produces: a script that exits non-zero when the services section, order, placement, or locale-aware links are missing.

- [ ] **Step 1: Write the failing check**

Create `scripts/check-homepage-services-section.mjs` that reads the homepage and component source, then asserts:

```javascript
import { readFile } from "node:fs/promises";

const home = await readFile("src/app/[locale]/page.js", "utf8");
const component = await readFile("src/components/HomeServicesSection.jsx", "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
  }
}

assert(home.includes("HomeServicesSection"), "Home page must render HomeServicesSection");
assert(
  home.indexOf("<NewsSection locale={locale} />") < home.indexOf("<HomeServicesSection locale={locale} />") &&
    home.indexOf("<HomeServicesSection locale={locale} />") < home.indexOf("<CulturalCalendarSection locale={locale} />"),
  "HomeServicesSection must appear after NewsSection and before CulturalCalendarSection"
);

const order = [
  "internal-oversight",
  "event-submission",
  "international-cooperation",
];
let lastIndex = -1;
for (const id of order) {
  const index = component.indexOf(`id: "${id}"`);
  assert(index > lastIndex, `${id} must appear in the expected service order`);
  lastIndex = index;
}

assert(component.includes("featured: true"), "Internal oversight card must have restrained emphasis");
assert(component.includes("`/${locale}/services/internal-oversight`"), "Internal oversight link must include locale");
assert(component.includes("`/${locale}/services/submit-event`"), "Event submission link must include locale");
assert(component.includes("`/${locale}/services/international-cooperation`"), "International cooperation link must include locale");
assert(component.includes("`/${locale}/services`"), "All services CTA must include locale");
```

- [ ] **Step 2: Run check to verify it fails**

Run: `node scripts/check-homepage-services-section.mjs`
Expected: FAIL because `src/components/HomeServicesSection.jsx` does not exist yet.

- [ ] **Step 3: Implement the component and homepage placement**

Create `src/components/HomeServicesSection.jsx` and render it in `src/app/[locale]/page.js` immediately after `NewsSection`.

- [ ] **Step 4: Run check to verify it passes**

Run: `node scripts/check-homepage-services-section.mjs`
Expected: PASS with exit code 0.

### Task 2: Remove Achievements Image Corner Overlay Icon

**Files:**
- Modify: `src/components/MonthlyAchievementsSection.jsx`
- Create: `scripts/check-achievements-overlay-icon.mjs`

**Interfaces:**
- Consumes: achievements component source as plain text.
- Produces: a script that exits non-zero if the gallery overlay icon marker remains.

- [ ] **Step 1: Write the failing check**

Create `scripts/check-achievements-overlay-icon.mjs` that reads `src/components/MonthlyAchievementsSection.jsx` and asserts the old gallery overlay icon marker is absent.

- [ ] **Step 2: Run check to verify it fails**

Run: `node scripts/check-achievements-overlay-icon.mjs`
Expected: FAIL while the overlay icon markup is still present.

- [ ] **Step 3: Remove only the overlay icon markup**

Delete the small corner gallery/photos overlay icon from image cards. Do not change image rendering, card links, text, or achievements data flow.

- [ ] **Step 4: Run check to verify it passes**

Run: `node scripts/check-achievements-overlay-icon.mjs`
Expected: PASS with exit code 0.

### Task 3: Final Verification

**Files:**
- Verify: `src/app/[locale]/page.js`
- Verify: `src/components/HomeServicesSection.jsx`
- Verify: `src/components/MonthlyAchievementsSection.jsx`

- [ ] **Step 1: Run static checks**

Run:

```bash
node scripts/check-homepage-services-section.mjs
node scripts/check-achievements-overlay-icon.mjs
```

Expected: both commands exit 0.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Next.js production build exits 0.
