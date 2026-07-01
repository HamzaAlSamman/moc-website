# Copyright Registration Wizard — Professionalization Design

Date: 2026-06-21

## Context

The public Copyright & IP registration service (`src/app/[locale]/services/copyright/page.js`) is a 4-step citizen wizard: terms → form → payment → tracking/certificate. Earlier work this session secured its API (`/api/copyright`, `/api/admin/copyright-submissions`) and polished the admin review panel (`CopyrightManager.jsx`). The user now wants the citizen-facing wizard itself brought to "professional / world-class" standard, across all 4 steps equally, focused on: form UX + validation, visual polish, and accessibility/mobile.

## Goals

- Real-time, field-level validation with inline error messages (not just `required` + a single submit-time toast).
- The same validation rules enforced server-side (`/api/copyright` POST), not just client-side.
- Accessible markup: label/input association, `aria-invalid`/`aria-describedby`, focus-visible rings on custom controls, `aria-live` toasts.
- Visual consistency: error/success states per field, smoother step transitions, all within the existing MOC brand (`#002723` / `#A48E68`) — no rebrand.
- Mobile pass: tap targets, breakpoints, print layout for the certificate.

## Non-goals

- No new dependencies. `zod` is already in `package.json` (unused anywhere yet) — it's the validation engine.
- No move to `react-hook-form` or a step-library; keep the existing `useState`-driven step machine in `page.js`.
- No automated test suite (none exists in this project); verification is manual via the browser preview tool.
- Do not touch the admin-side auth/workflow already hardened earlier this session.

## Architecture

### 1. Shared validation module — `src/lib/copyright-validation.js`

One file, plain `zod` schemas, importable from both the client component and the API route:

- `applicantSchema` — name (min length), phone (Syrian format `^09\d{8}$`), email (`z.string().email()`), role enum.
- `workSchema` — title (min length), category enum, description (min length), conditional rules via `.superRefine`:
  - `originalWorkName` + `originalPermission` required when `workOrigin === "derived"`.
  - implicit `hasTelecomDoc` required true when `workCategory === "informational"` (file presence itself stays a UI-state check, see below).
- `logisticsSchema` — province, center, completionDate (non-empty, not a future date beyond today).
- `fullSubmissionSchema` — merges the above into the actual POST payload shape; this is what the API route validates.
- File-required checks (work file, ID scan, telecom doc, role doc) stay as UI-state booleans in `page.js` — these aren't part of the JSON payload (files are never actually persisted as binaries, only the payment receipt is base64'd), so they don't belong in the zod schema. They get the same inline-error treatment for visual consistency, just driven by local state instead of zod.

### 2. Client-side hook-like helper — inline in `page.js`

A small `validateField(name, value, formSnapshot)` function that runs the relevant zod sub-schema for one field and returns an error string or `null`. State additions:

- `touched` — `{ [fieldName]: boolean }`, set on blur.
- `errors` — `{ [fieldName]: string | null }`, recomputed on change (only shown once a field is `touched`, or after a failed submit attempt which marks everything touched).

On submit: run the full schema, mark all fields touched, focus + scroll to the first invalid field, show one summary toast. No change to the existing toast component itself beyond adding `aria-live="assertive"` to its container.

### 3. Server-side hardening — `src/app/api/copyright/route.js`

Replace the current two-field check in `POST` with `fullSubmissionSchema.safeParse(data)`. On failure, return `{ error, fieldErrors }` with status 400 instead of a generic message — gives any non-browser client (or a buggy future frontend change) real feedback, and closes the gap where the server currently accepts almost any garbage payload as long as `applicantName`/`workTitle` are non-empty.

### 4. Accessibility pass (no new files, edits across `page.js`)

- Every `<label>` gets `htmlFor` matching its input's `id` (currently none of the ~20 fields have this pairing).
- Invalid inputs get `aria-invalid="true"` and `aria-describedby="<field>-error"`; the error `<p>` gets that `id`.
- File-upload decoy cards and role-selection radio cards get visible `:focus-visible` rings (currently only `:hover` styled).
- Step indicator dots get a visually-hidden `aria-current="step"` label ("الخطوة 2 من 3: بوابة الدفع").
- Toast container gets `role="status" aria-live="polite"` (`assertive` for error-type toasts).

### 5. Visual polish

- Error state: `border-rose-400` + red helper text with `AlertCircle` icon (already imported, currently unused) under the field.
- Success state (touched + valid): thin `border-emerald-300` on key fields (phone/email) — subtle, not a full redesign.
- Step transitions: reuse the existing `animate-fade-in-up` utility class (already used elsewhere in this file) on the step container instead of an abrupt swap.
- Certificate (step 4): switch the signature grid to `grid-cols-1 sm:grid-cols-2` so it doesn't cramp on narrow phones, verify `print:hidden` coverage is complete.

### 6. Mobile pass

Resize-test each step at a narrow viewport (375px) via the preview tool; fix any overflow found (most of the layout is already responsive via `sm:`/`md:` classes — this is a verification pass, not a rebuild).

## Error handling

- Client validation errors: inline, non-blocking until submit (per-field, as described above).
- Network/API errors: unchanged toast pattern, just made screen-reader-announced.
- Server validation errors (malformed payload bypassing the client): structured 400 response; not currently surfaced anywhere else that calls this endpoint with attacker-controlled input, so this is pure defense-in-depth.

## Testing / verification plan

No automated test framework exists in this project. Verification is manual, via the Claude Preview browser tool:

1. Fill each field with invalid data (bad phone, bad email, empty required fields) → confirm red inline error appears under the right field, clears when corrected.
2. Tab through step 1 keyboard-only → confirm every control (including file cards and radio cards) is reachable and shows a visible focus ring.
3. Submit with missing fields → confirm focus jumps to the first invalid field and a summary toast appears.
4. Resize to a mobile width (375px) and walk through all 4 steps.
5. Hit `/api/copyright` POST directly with a malformed payload (e.g. missing email) → confirm 400 with field errors, confirms server-side enforcement.
6. Print-preview step 4 (certificate) to confirm layout holds.
