# Number Circle Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:verification-before-completion while implementing this plan.

**Goal:** Optically center all numbers displayed inside circular UI elements and retain the latest copyright portal header.

**Architecture:** Add one explicit CSS utility in `src/app/globals.css` and apply it to numeric circles only. Protect the scope with a Node test that scans the selected JSX sources for circular numeric elements.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Node test runner.

---

### Task 1: Add the regression test

**Files:**
- Create: `src/components/number-circle-alignment.test.mjs`

1. Read the affected JSX sources and match circular elements containing fixed or computed numbers.
2. Assert that every match includes the `number-circle` class.
3. Assert that the copyright portal uses the current Arabic title and `SubpageHero` without the legacy title.
4. Run `node --test src/components/number-circle-alignment.test.mjs` and confirm it fails because the utility is absent.

### Task 2: Add and apply the shared utility

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/[locale]/services/copyright/page.js`
- Modify: `src/app/[locale]/services/submit-event/page.js`
- Modify: `src/app/[locale]/services/internal-oversight/page.js`
- Modify: `src/app/[locale]/services/international-cooperation/page.js`
- Modify: `src/app/[locale]/news/NewsListView.jsx`
- Modify: `src/components/CulturalCalendarSection.jsx`
- Modify: `src/components/DateRangePicker.jsx`
- Modify: `src/components/admin/AdminTopbar.jsx`
- Modify: `src/components/admin/CopyrightDetailView.jsx`

1. Define `.number-circle` with centered layout, isolated LTR numeric direction, stable numeric font metrics, `line-height: 1`, and a small optical vertical correction.
2. Add the class to every numeric circle matched by the regression test.
3. Do not modify icon circles, decorative dots, pills, or non-circular number labels.
4. Run the focused test and confirm it passes.

### Task 3: Verify the result

**Files:**
- Test: `src/components/number-circle-alignment.test.mjs`

1. Run all Node tests with `node --test` over the project test files.
2. Run `npm run build`.
3. Start or inspect the local app and verify the copyright route shows `بوابة حماية حقوق المؤلف` without the legacy title.
4. Inspect the git diff to confirm unrelated user changes were preserved.

