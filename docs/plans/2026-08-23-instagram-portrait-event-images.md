# Instagram Portrait Event Images Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Present every event image in a consistent Instagram portrait `4:5` frame while preserving all content in older landscape artwork.

**Architecture:** Add one reusable `EventArtwork` client component that owns the `4:5` frame, blurred decorative backdrop, contained foreground image, and existing fallback behavior. Replace the public calendar, event-detail, related-card, and admin-preview image frames with that component or the same shared ratio guidance; no API or database changes are required.

**Tech Stack:** Next.js 16 App Router, React 19, `next/image` through `ImageWithFallback`, Tailwind CSS 4, Node.js test runner.

---

### Task 1: Build the shared portrait artwork component

**Files:**
- Create: `src/components/EventArtwork.jsx`
- Create: `src/lib/event-artwork-ui.test.mjs`
- Modify: `src/components/ImageWithFallback.jsx`
- Read: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`

**Step 1: Write the failing test**

Create a Node source-contract test that reads `components/EventArtwork.jsx` and asserts it contains `aspect-[4/5]`, `object-contain`, a blurred `object-cover` layer, `aria-hidden="true"`, and `ImageWithFallback`.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("shared event artwork preserves posters inside a 4:5 frame", async () => {
  const text = await source("components/EventArtwork.jsx");
  assert.match(text, /aspect-\[4\/5\]/);
  assert.match(text, /object-contain/);
  assert.match(text, /object-cover/);
  assert.match(text, /blur-/);
  assert.match(text, /aria-hidden="true"/);
  assert.match(text, /ImageWithFallback/);
});
```

**Step 2: Verify the test fails**

Run `node --test src/lib/event-artwork-ui.test.mjs --test-name-pattern="shared event artwork"`.

Expected: FAIL because `EventArtwork.jsx` does not exist.

**Step 3: Implement the component**

Create `src/components/EventArtwork.jsx` as a `4:5` positioned frame. Render one decorative `ImageWithFallback` with empty alt text, `object-cover`, blur, opacity, and a dark ministry-green veil. Render the meaningful foreground `ImageWithFallback` above it with `object-contain`. Accept `src`, `alt`, `sizes`, `preload`, `className`, and `imageClassName` props.

Update `ImageWithFallback` to accept and forward Next.js 16's `preload` prop. Preserve its existing optimizer → raw image → branded fallback sequence and its eager raw-image behavior when preload is requested. Do not add the deprecated `priority` prop to new usage.

**Step 4: Verify the test passes**

Run the same test. Expected: PASS.

**Step 5: Commit**

```powershell
git add -- src/components/EventArtwork.jsx src/components/ImageWithFallback.jsx src/lib/event-artwork-ui.test.mjs
git commit -m "feat: add portrait event artwork component"
```

### Task 2: Convert the cultural-calendar thumbnail and dialog

**Files:**
- Modify: `src/components/CulturalCalendarSection.jsx:731-764`
- Modify: `src/components/CulturalCalendarSection.jsx:998-1095`
- Modify: `src/lib/event-artwork-ui.test.mjs`

Preserve the existing uncommitted Arabic month-name change in `CulturalCalendarSection.jsx`.

**Step 1: Add a failing integration test**

Append a test that requires an `EventArtwork` import, at least two `<EventArtwork` usages, no `aspect-[16/9]`, and a desktop dialog grid containing `lg:grid-cols-[minmax(0,380px)_1fr]`.

**Step 2: Verify it fails**

Run `node --test src/lib/event-artwork-ui.test.mjs --test-name-pattern="calendar event images"`.

Expected: FAIL because the calendar still uses square and `16:9` frames.

**Step 3: Replace the small thumbnail**

Import `EventArtwork`. Replace the fixed square image with a `w-14 sm:w-16` portrait component using `sizes="64px"` and `rounded-xl`. Preserve the overlaid status badge, card click target, and event text.

**Step 4: Restructure the dialog**

- Increase the dialog to `max-w-5xl`.
- Use `lg:grid lg:grid-cols-[minmax(0,380px)_1fr]` inside the viewport-bounded dialog.
- Put `EventArtwork` in the poster column with `sizes="(max-width: 1024px) 100vw, 380px"`.
- Move the title out of the artwork overlay and into the details column.
- Keep the close button absolutely positioned above both columns with a high z-index.
- Keep the details column independently scrollable and preserve description, date, time, location, and booking links.
- On mobile, retain stacking and `max-h-[90vh]`.

**Step 5: Verify it passes**

Run the calendar test. Expected: PASS.

**Step 6: Commit**

```powershell
git add -- src/components/CulturalCalendarSection.jsx src/lib/event-artwork-ui.test.mjs
git commit -m "feat: use portrait artwork in event calendar"
```

### Task 3: Convert the public event page and related cards

**Files:**
- Modify: `src/app/[locale]/events/[id]/page.js:1-251`
- Modify: `src/lib/event-artwork-ui.test.mjs`

Preserve the current uncommitted event-page redesign, booking panel, event actions, status badges, metadata panel, and related-event section.

**Step 1: Add a failing integration test**

Append a test requiring an `EventArtwork` import, at least two usages, no `aspect-[21/9]` or `aspect-[16/9]`, and a `max-w-[540px]` cap on the main poster.

**Step 2: Verify it fails**

Run `node --test src/lib/event-artwork-ui.test.mjs --test-name-pattern="event detail and related"`.

Expected: FAIL while panoramic frames remain.

**Step 3: Replace the event hero**

Replace the panoramic image wrapper with a centered `EventArtwork` capped at `max-w-[540px]`. Retain rounded border and shadow styling. Pass `preload` and responsive `sizes` no larger than the rendered poster. Keep the header and metadata sections in their current order.

**Step 4: Replace related-card frames**

Use `EventArtwork` at the top of every related-event card. Keep the grid, hover state, date, title, location, and link behavior. Apply foreground hover scale through `imageClassName`.

**Step 5: Verify it passes**

Run the event-page test. Expected: PASS.

**Step 6: Commit**

```powershell
git add -- 'src/app/[locale]/events/[id]/page.js' src/lib/event-artwork-ui.test.mjs
git commit -m "feat: use portrait artwork on event details"
```

### Task 4: Update the admin upload preview and guidance

**Files:**
- Modify: `src/components/admin/EventForm.jsx:442-480`
- Modify: `src/lib/event-artwork-ui.test.mjs`

**Step 1: Add a failing admin test**

Append a test requiring `aspect-[4/5]`, `1080 × 1350`, and `object-contain` in `EventForm.jsx`.

**Step 2: Verify it fails**

Run `node --test src/lib/event-artwork-ui.test.mjs --test-name-pattern="admin event form"`.

Expected: FAIL because the preview is a short `object-cover` strip with no guidance.

**Step 3: Implement the preview**

- Change the preview to a centered `aspect-[4/5] max-w-xs` frame.
- Use a ministry-green background and `object-contain` so the whole upload is visible.
- Keep the change-image overlay, delete button, upload progress, and file input behavior.
- Add `المقاس الموصى به: 1080 × 1350 بكسل (4:5)` below the accepted-format text.
- Keep the ratio advisory; do not reject older files.

**Step 4: Verify it passes**

Run the admin test. Expected: PASS.

**Step 5: Commit**

```powershell
git add -- src/components/admin/EventForm.jsx src/lib/event-artwork-ui.test.mjs
git commit -m "feat: guide editors toward portrait event artwork"
```

### Task 5: Verify behavior and production build

**Files:** Verify only; fix only the files listed above if a check exposes a regression.

**Step 1: Run focused tests**

Run `node --test src/lib/event-artwork-ui.test.mjs`.

Expected: all event artwork tests PASS.

**Step 2: Run related UI tests**

Run `node --test src/components/citizen/citizen-booking-ui.test.mjs`.

Expected: all tests PASS.

**Step 3: Build**

Run `npm run build`.

Expected: Next.js production build exits 0. Do not deploy; deployment is outside this request.

**Step 4: Perform visual QA**

Inspect Arabic and English at mobile and desktop sizes: calendar thumbnail, calendar dialog, public event poster, related cards, and admin preview. Check portrait, landscape, missing, and broken sources. Confirm the dialog closes and scrolls, links work, and landscape text remains uncropped.

**Step 5: Review the final diff**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors and no unrelated user-owned files staged or modified by this work.
