# Copyright Registration Wizard Professionalization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the public Copyright & IP registration wizard (`src/app/[locale]/services/copyright/page.js`, all 4 steps) up to a professional standard: real-time inline field validation (shared client+server schema), accessible markup, and small visual/mobile polish — without a rebrand or new dependencies.

**Architecture:** A single new `zod` schema module (`src/lib/copyright-validation.js`) is the one source of truth for form-data rules. The client re-runs it on every keystroke (scoped to touched fields) to drive inline error text; the API route (`/api/copyright` POST) re-runs the same schema before writing to the database. No new state-management library — the existing `useState`-driven step machine in `page.js` stays as-is; we only add `touched`/`errors` state and a couple of small reusable helpers.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, `zod` (already a dependency, currently unused anywhere in the codebase), Prisma.

**Design doc:** `docs/plans/2026-06-21-copyright-form-professionalization-design.md`

**Verification:** This project has no automated test framework (no jest/playwright in `package.json`). Every task's "verify" step is either `npx next build` (catches syntax/type errors) or a manual check via the Claude Preview MCP browser tool. Do not add a new test framework — that's out of scope.

---

### Task 1: Shared validation schema module

**Files:**
- Create: `src/lib/copyright-validation.js`

**Step 1: Write the module**

```js
import "server-only";
import { z } from "zod";

// Syrian mobile numbers as collected by this form: 09 + 8 digits.
const phoneRegex = /^09\d{8}$/;

export const fullSubmissionSchema = z
  .object({
    applicantName: z.string().trim().min(3, "الاسم الرباعي مطلوب (3 أحرف على الأقل)"),
    applicantPhone: z.string().trim().regex(phoneRegex, "رقم الموبايل يجب أن يكون بصيغة 09xxxxxxxx"),
    applicantEmail: z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة"),
    applicantRole: z.enum(["author", "agent", "heir", "representative"]),
    workTitle: z.string().trim().min(3, "عنوان العمل مطلوب (3 أحرف على الأقل)"),
    workCategory: z.enum(["written", "informational", "audio_visual", "fine_arts", "folklore"]),
    workOrigin: z.enum(["original", "derived"]),
    originalWorkName: z.string().trim().optional().default(""),
    originalPermission: z.string().trim().optional().default(""),
    workDesc: z.string().trim().min(10, "يرجى كتابة وصف لا يقل عن 10 أحرف"),
    province: z.string().trim().min(1, "المحافظة مطلوبة"),
    center: z.string().trim().min(1, "مركز الإيداع مطلوب"),
    completionDate: z.string().trim().min(1, "تاريخ إنجاز العمل مطلوب"),
  })
  .superRefine((data, ctx) => {
    if (data.workOrigin === "derived") {
      if (!data.originalWorkName) {
        ctx.addIssue({ code: "custom", path: ["originalWorkName"], message: "اسم العمل الأصلي مطلوب لأن هذا العمل مقتبس" });
      }
      if (!data.originalPermission) {
        ctx.addIssue({ code: "custom", path: ["originalPermission"], message: "وثيقة موافقة صاحب العمل الأصلي مطلوبة" });
      }
    }
    const completion = new Date(data.completionDate);
    if (Number.isNaN(completion.getTime())) {
      ctx.addIssue({ code: "custom", path: ["completionDate"], message: "تاريخ غير صالح" });
    } else if (completion.getTime() > Date.now()) {
      ctx.addIssue({ code: "custom", path: ["completionDate"], message: "تاريخ الإنجاز لا يمكن أن يكون بالمستقبل" });
    }
  });

// Re-validates the whole object and returns just the error message for one
// field (or null). Re-checking everything each call keeps cross-field rules
// (e.g. workOrigin === "derived") correct as other fields change — the form
// is small enough that this is cheap to call on every keystroke.
export function validateField(name, formSnapshot) {
  const result = fullSubmissionSchema.safeParse(formSnapshot);
  if (result.success) return null;
  const issue = result.error.issues.find((i) => i.path[0] === name);
  return issue ? issue.message : null;
}

// Returns a flat { fieldName: message } map for every invalid field — used
// on submit attempt (client) and by the API route (server).
export function validateAll(formSnapshot) {
  const result = fullSubmissionSchema.safeParse(formSnapshot);
  if (result.success) return {};
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
```

Note: `import "server-only"` would break client-side usage — **remove that first line**. This module is imported from both a `"use client"` page and a server route, so it must have no server-only guard. (Listed here as a reminder; the code block above should be written WITHOUT the `import "server-only";` line.)

**Step 2: Verify**

Run: `cd "F:\تطبيقات انا عم اعملها\MOC\moc-website" && npx next build`
Expected: `✓ Compiled successfully` (this file isn't imported anywhere yet, so it just needs to parse cleanly — build will succeed identically to before this task).

---

### Task 2: Wire `touched`/`errors` state and helpers into the page

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js`

**Step 1: Add the import**

Near the top of the file, alongside the other imports (after the `ApexDateTimePicker` import, currently around line 8):

```js
import { validateField, validateAll } from "../../../../lib/copyright-validation";
```

(Match the existing relative-import style used by the other imports in this file — do not use the `@/` alias here since none of this file's other local imports use it.)

**Step 2: Add a small reusable error component**

Right after the `Tooltip` function (currently lines 395–405), add:

```js
function FieldErrorText({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </p>
  );
}
```

(`AlertCircle` is already imported from `lucide-react` at the top of this file and currently unused — no new import needed.)

**Step 3: Add `touched`/`errors` state and helpers inside `CopyrightPage`**

Right after the existing `const [form, setForm] = useState(INITIAL_FORM);` line (currently line 419), add:

```js
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  const fieldError = (field) => (touched[field] ? errors[field] : null);

  const fieldClass = (field, extra) => {
    const hasError = !!fieldError(field);
    return `${extra} ${
      hasError
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
        : "border-slate-200 focus:border-[#A48E68] focus:ring-[#A48E68]/15"
    }`;
  };
```

Then, after the existing `handleProvinceChange` function (currently around line 511), add an effect that keeps `errors` in sync with `form` for every field the user has already touched:

```js
  // Re-validate every touched field whenever the form changes, so an error
  // clears the moment the user fixes it (not just on next blur).
  useEffect(() => {
    setErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const field of Object.keys(touched)) {
        if (!touched[field]) continue;
        const msg = validateField(field, form);
        if (next[field] !== msg) {
          next[field] = msg;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [form, touched]);
```

**Step 4: Verify**

Run: `npx next build`
Expected: `✓ Compiled successfully`. `touched`/`errors`/`fieldClass`/`fieldError`/`FieldErrorText` are unused at this point — that's fine, ESLint isn't run as part of `next build` in this project (no `eslint.config.js` exists), so unused-var warnings won't fail the build.

---

### Task 3: Wire validation into Section 1 (personal info)

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js` (Section 1 block, currently lines 1092–1163)

Replace the name field (currently lines 1099–1108):

```jsx
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="applicantName" className="text-sm font-semibold text-slate-700">{t.nameLabel}</label>
                        <Tooltip text={isRtl ? "يرجى كتابة الاسم الرباعي كما هو وارد في بطاقتك الشخصية." : "Full name exactly as on your national ID."} />
                      </div>
                      <input id="applicantName" type="text" required value={form.applicantName}
                        onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                        onBlur={() => handleBlur("applicantName")}
                        aria-invalid={!!fieldError("applicantName")}
                        aria-describedby={fieldError("applicantName") ? "applicantName-error" : undefined}
                        placeholder={t.namePlaceholder}
                        className={fieldClass("applicantName", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2")} />
                      <FieldErrorText id="applicantName-error" message={fieldError("applicantName")} />
                    </div>
```

Replace the phone + email pair (currently lines 1109–1130):

```jsx
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="applicantPhone" className="text-sm font-semibold text-slate-700">{t.phoneLabel}</label>
                          <Tooltip text={isRtl ? "سنرسل لك SMS عند تحديث حالة طلبك." : "We will SMS you on status updates."} />
                        </div>
                        <input id="applicantPhone" type="tel" required value={form.applicantPhone}
                          onChange={(e) => setForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                          onBlur={() => handleBlur("applicantPhone")}
                          aria-invalid={!!fieldError("applicantPhone")}
                          aria-describedby={fieldError("applicantPhone") ? "applicantPhone-error" : undefined}
                          placeholder={t.phonePlaceholder} dir="ltr"
                          className={fieldClass("applicantPhone", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2")} />
                        <FieldErrorText id="applicantPhone-error" message={fieldError("applicantPhone")} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="applicantEmail" className="text-sm font-semibold text-slate-700">{t.emailLabel}</label>
                          <Tooltip text={isRtl ? "سنرسل لك الشهادة الرقمية على هذا البريد." : "We will send your certificate to this email."} />
                        </div>
                        <input id="applicantEmail" type="email" required value={form.applicantEmail}
                          onChange={(e) => setForm((f) => ({ ...f, applicantEmail: e.target.value }))}
                          onBlur={() => handleBlur("applicantEmail")}
                          aria-invalid={!!fieldError("applicantEmail")}
                          aria-describedby={fieldError("applicantEmail") ? "applicantEmail-error" : undefined}
                          placeholder={t.emailPlaceholder} dir="ltr"
                          className={fieldClass("applicantEmail", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2")} />
                        <FieldErrorText id="applicantEmail-error" message={fieldError("applicantEmail")} />
                      </div>
                    </div>
```

Role radio cards — only an accessibility touch (no validation needed, it always has a valid default). In the block currently at lines 1131–1161, add a visible keyboard-focus ring to the card `<label>` (the radio input itself is visually tiny; the whole card is the clickable/focusable area via `:focus-within`):

Find:
```jsx
                          <label key={item.val} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                            form.applicantRole === item.val
                              ? "border-[#A48E68] bg-[#A48E68]/8 text-[#002723]"
                              : "border-slate-200 hover:border-slate-300 text-slate-600"
                          }`}>
```
Replace with:
```jsx
                          <label key={item.val} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#A48E68]/40 ${
                            form.applicantRole === item.val
                              ? "border-[#A48E68] bg-[#A48E68]/8 text-[#002723]"
                              : "border-slate-200 hover:border-slate-300 text-slate-600"
                          }`}>
```

**Verify:** `npx next build` → `✓ Compiled successfully`.

---

### Task 4: Wire validation into Section 2 (work details)

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js` (Section 2 block, currently lines 1205–1278)

Replace the work title field (currently lines 1212–1221):

```jsx
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="workTitle" className="text-sm font-semibold text-slate-700">{t.workTitleLabel}</label>
                        <Tooltip text={isRtl ? "اسم كتابك أو الأغنية أو التطبيق." : "Title of your book, song, or app."} />
                      </div>
                      <input id="workTitle" type="text" required value={form.workTitle}
                        onChange={(e) => setForm((f) => ({ ...f, workTitle: e.target.value }))}
                        onBlur={() => handleBlur("workTitle")}
                        aria-invalid={!!fieldError("workTitle")}
                        aria-describedby={fieldError("workTitle") ? "workTitle-error" : undefined}
                        placeholder={t.workTitlePlaceholder}
                        className={fieldClass("workTitle", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 focus:ring-2")} />
                      <FieldErrorText id="workTitle-error" message={fieldError("workTitle")} />
                    </div>
```

Category/origin selects (lines 1222–1250) — accessibility-only, add `id`/`htmlFor`:

Find the category `<label>`/`<select>` pair and add `htmlFor="workCategory"` / `id="workCategory"`. Find the origin `<label>`/`<select>` pair and add `htmlFor="workOrigin"` / `id="workOrigin"`. (Mechanical — same pattern as the name field's `htmlFor`/`id` pairing, no validation/error UI needed since both selects always have a valid default value.)

Replace the conditional "derived work" fields (currently lines 1251–1266):

```jsx
                    {form.workOrigin === "derived" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <label htmlFor="originalWorkName" className="block text-sm font-semibold text-slate-700 mb-2">{t.origNameLabel}</label>
                          <input id="originalWorkName" type="text" required value={form.originalWorkName}
                            onChange={(e) => setForm((f) => ({ ...f, originalWorkName: e.target.value }))}
                            onBlur={() => handleBlur("originalWorkName")}
                            aria-invalid={!!fieldError("originalWorkName")}
                            aria-describedby={fieldError("originalWorkName") ? "originalWorkName-error" : undefined}
                            className={fieldClass("originalWorkName", "w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition bg-white focus:ring-2")} />
                          <FieldErrorText id="originalWorkName-error" message={fieldError("originalWorkName")} />
                        </div>
                        <div>
                          <label htmlFor="originalPermission" className="block text-sm font-semibold text-slate-700 mb-2">{t.origPermLabel}</label>
                          <input id="originalPermission" type="text" required value={form.originalPermission}
                            onChange={(e) => setForm((f) => ({ ...f, originalPermission: e.target.value }))}
                            onBlur={() => handleBlur("originalPermission")}
                            aria-invalid={!!fieldError("originalPermission")}
                            aria-describedby={fieldError("originalPermission") ? "originalPermission-error" : undefined}
                            className={fieldClass("originalPermission", "w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition bg-white focus:ring-2")} />
                          <FieldErrorText id="originalPermission-error" message={fieldError("originalPermission")} />
                        </div>
                      </div>
                    )}
```

Replace the description textarea (currently lines 1267–1276):

```jsx
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="workDesc" className="text-sm font-semibold text-slate-700">{t.descLabel}</label>
                        <Tooltip text={isRtl ? "اشرح ببساطة فكرة العمل وميزاته." : "Briefly describe what the work does and its unique features."} />
                      </div>
                      <textarea id="workDesc" required rows={4} value={form.workDesc}
                        onChange={(e) => setForm((f) => ({ ...f, workDesc: e.target.value }))}
                        onBlur={() => handleBlur("workDesc")}
                        aria-invalid={!!fieldError("workDesc")}
                        aria-describedby={fieldError("workDesc") ? "workDesc-error" : undefined}
                        placeholder={t.descPlaceholder}
                        className={fieldClass("workDesc", "w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white resize-none placeholder:text-slate-400 focus:ring-2")} />
                      <FieldErrorText id="workDesc-error" message={fieldError("workDesc")} />
                    </div>
```

**Verify:** `npx next build` → `✓ Compiled successfully`.

---

### Task 5: Wire validation into Section 3 (date/location) and Section 4 (files)

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js` (Section 3: lines 1280–1311; Section 4: lines 1313–1361)

Section 3 — accessibility-only for province/center (`htmlFor`/`id`, both always have a valid default), and validation for the date field. Replace the completion-date block (currently lines 1303–1308):

```jsx
                      <div>
                        <label htmlFor="completionDate" className="block text-sm font-semibold text-slate-700 mb-2">{t.completionDateLabel}</label>
                        <ApexDateTimePicker type="date" id="completionDate" value={form.completionDate}
                          onChange={(val) => { setForm((f) => ({ ...f, completionDate: val })); handleBlur("completionDate"); }}
                          locale={locale} />
                        <FieldErrorText id="completionDate-error" message={fieldError("completionDate")} />
                      </div>
```

Note: `ApexDateTimePicker` doesn't fire a separate blur event in its current API (check `src/components/ApexDateTimePicker.jsx` if unsure), so this task marks the field touched on every `onChange` instead of on blur — for a date picker that's the natural equivalent of "the user interacted with it." If `ApexDateTimePicker` doesn't forward a plain `id` prop to its underlying input, the `<FieldErrorText>` still works correctly (it doesn't depend on the `id` being applied — `id="completionDate"` is for the `<label htmlFor>` association and is purely a nice-to-have here, not load-bearing for validation, which is keyed by the `form.completionDate` value, not the DOM id).

Section 4 — file upload cards get a focus-visible ring + an accessible name on the real (visually hidden) `<input type="file">`. This is the `FileUploadCard` component, defined once near the bottom of the file (currently lines 968–985), not the call sites in Section 4 — fixing the component fixes every usage at once:

Find:
```jsx
  const FileUploadCard = ({ icon, label, desc, fileLabel, onChange, required: isRequired, highlight }) => (
    <div className={`group relative rounded-2xl p-5 border transition-all cursor-pointer ${highlight ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white hover:border-[#A48E68]/50"}`}>
```
Replace with:
```jsx
  const FileUploadCard = ({ icon, label, desc, fileLabel, onChange, required: isRequired, highlight }) => (
    <div className={`group relative rounded-2xl p-5 border transition-all cursor-pointer focus-within:ring-2 focus-within:ring-[#A48E68]/40 focus-within:border-[#A48E68] ${highlight ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white hover:border-[#A48E68]/50"}`}>
```

Find (a few lines below, still inside `FileUploadCard`):
```jsx
      <input type="file" required={false} onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
```
Replace with:
```jsx
      <input type="file" aria-label={label} required={false} onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
```

**Verify:** `npx next build` → `✓ Compiled successfully`.

---

### Task 6: Rewrite the submit handler to gate on the shared schema

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js` (`handleFormSubmit`, currently starting at line 514)

Find the start of the function:
```jsx
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // File uploads validation
```

Insert a new validation gate immediately after `e.preventDefault();` and before the `// File uploads validation` comment:

```jsx
    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length > 0) {
      setTouched((t) => {
        const next = { ...t };
        Object.keys(fieldErrors).forEach((f) => { next[f] = true; });
        return next;
      });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      const firstField = Object.keys(fieldErrors)[0];
      const el = document.getElementById(firstField);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      showToast(isRtl ? "يرجى تصحيح الحقول المظلّلة بالأحمر" : "Please fix the highlighted fields", "error");
      return;
    }

```

Everything below this (the existing file-upload checks, joint-author checks, payload build, and `fetch` call) stays exactly as-is — this only adds a gate in front of it.

**Verify:**

1. `npx next build` → `✓ Compiled successfully`.
2. Manual: see Task 10 (end-to-end browser verification covers this).

---

### Task 7: Inline validation for the payment step (Step 2)

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js` (Step 2 block, currently lines 1394–1548)

This field (`paymentRef`) isn't part of the submission `form` object — it's separate local state — so it doesn't belong in the shared zod schema. Add a tiny local check instead of extending the shared module for one field.

Add, right after the `fieldClass` helper added in Task 2:

```js
  const paymentRefError =
    touched.paymentRef && paymentRef.trim().length < 4
      ? (isRtl ? "رقم المرجع غير صحيح (4 أرقام على الأقل)" : "Reference number looks too short")
      : null;
```

Replace the payment-reference input (currently lines 1507–1512):

```jsx
                      <div>
                        <label htmlFor="paymentRef" className="block text-sm font-semibold text-slate-700 mb-2">{t.payRefLabel}</label>
                        <input id="paymentRef" type="text" value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          onBlur={() => handleBlur("paymentRef")}
                          aria-invalid={!!paymentRefError}
                          aria-describedby={paymentRefError ? "paymentRef-error" : undefined}
                          placeholder={t.payRefPlaceholder} dir="ltr"
                          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition bg-white placeholder:text-slate-400 font-mono focus:ring-2 ${
                            paymentRefError
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-[#A48E68] focus:ring-[#A48E68]/15"
                          }`} />
                        <FieldErrorText id="paymentRef-error" message={paymentRefError} />
                      </div>
```

Then in `handlePaymentSubmit` (search for `const handlePaymentSubmit = async`), the existing check:
```js
      if (!paymentRef.trim()) {
        showToast(isRtl ? "يرجى إدخال رقم مرجع العملية/الحوالة للاستمرار" : "Please enter the transaction reference number", "error");
        return;
      }
```
should additionally mark the field touched so the inline error shows if the user clicks "Pay" without ever blurring the field:
```js
      if (!paymentRef.trim() || paymentRef.trim().length < 4) {
        handleBlur("paymentRef");
        showToast(isRtl ? "يرجى إدخال رقم مرجع العملية/الحوالة للاستمرار" : "Please enter the transaction reference number", "error");
        return;
      }
```

**Verify:** `npx next build` → `✓ Compiled successfully`.

---

### Task 8: Accessibility — toast `aria-live` and step-indicator `aria-current`

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js` (toast block ~line 1044; step indicator ~lines 998–1017)

Toast — find:
```jsx
      {toast.show && (
        <div className={`fixed top-6 ${isRtl ? "left-4" : "right-4"} z-50 max-w-sm w-full px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 transition-all animate-fade-in print:hidden ${
          toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-rose-600 text-white" : "bg-slate-800 text-white"
        }`}>
```
Replace with:
```jsx
      {toast.show && (
        <div
          role="status"
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`fixed top-6 ${isRtl ? "left-4" : "right-4"} z-50 max-w-sm w-full px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 transition-all animate-fade-in print:hidden ${
          toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-rose-600 text-white" : "bg-slate-800 text-white"
        }`}>
```

Step indicator — find the step-circle `<div>` inside the `[1, 2, 3].map((s) => ...)` block:
```jsx
                    <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                      step === s ? "bg-[#A48E68] text-[#002723]" : step > s ? "bg-white/20 text-white" : "bg-white/10 text-white/40"
                    }`}>
                      {step > s ? "✓" : s}
                    </div>
```
Replace with:
```jsx
                    <div
                      aria-current={step === s ? "step" : undefined}
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                      step === s ? "bg-[#A48E68] text-[#002723]" : step > s ? "bg-white/20 text-white" : "bg-white/10 text-white/40"
                    }`}>
                      <span className="sr-only">
                        {isRtl ? `الخطوة ${s} من 3: ` : `Step ${s} of 3: `}
                        {s === 1 ? t.step1 : s === 2 ? t.step2 : t.step3}
                      </span>
                      {step > s ? "✓" : s}
                    </div>
```

**Verify:** `npx next build` → `✓ Compiled successfully`.

---

### Task 9: Visual polish — step transitions and certificate mobile fix

**Files:**
- Modify: `src/app/[locale]/services/copyright/page.js`

Add the existing `animate-fade-in-up` utility (already used elsewhere in this same file, e.g. in `renderTrackingDashboard` — no new CSS needed) to each step's outer container so switching steps fades in instead of popping abruptly:

- Step 1 form tag — find `<form onSubmit={handleFormSubmit} className="space-y-6 text-start print:hidden">` → add `animate-fade-in-up`: `className="space-y-6 text-start print:hidden animate-fade-in-up"`.
- Step 2 wrapper — find `{step === 2 && (\n  <div className="space-y-6 print:hidden">` → `className="space-y-6 print:hidden animate-fade-in-up"`.
- Step 3 wrapper — find `{step === 3 && (\n  <div className="space-y-6 print:hidden">` → `className="space-y-6 print:hidden animate-fade-in-up"`.
- Step 4 wrapper — find `{step === 4 && (\n  <div className="space-y-6 max-w-2xl mx-auto">` → `className="space-y-6 max-w-2xl mx-auto animate-fade-in-up"`.

Certificate signature grid — mobile fix. Find (currently line 1637):
```jsx
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100 text-center">
```
Replace with:
```jsx
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pt-6 border-t border-slate-100 text-center">
```

**Verify:** `npx next build` → `✓ Compiled successfully`.

---

### Task 10: Server-side validation hardening

**Files:**
- Modify: `src/app/api/copyright/route.js`

Add the import at the top, alongside the other imports:
```js
import { fullSubmissionSchema } from "@/lib/copyright-validation";
```
(This route is a server file, so the `@/` alias is fine here, matching this file's existing import style.)

In `POST`, find:
```js
    const data = await request.json();

    if (!data.applicantName?.trim() || !data.workTitle?.trim()) {
      return NextResponse.json({ error: "الحقول الأساسية مطلوبة" }, { status: 400 });
    }
```
Replace with:
```js
    const data = await request.json();

    const parsed = fullSubmissionSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "بيانات الطلب غير صحيحة أو ناقصة", fieldErrors }, { status: 400 });
    }
```

Leave the rest of `POST` (the `prisma.copyrightSubmission.create({...})` call, which reads from `data.xxx`) unchanged — `data` still has the same shape, this only adds a validation gate in front of it.

**Verify:**

1. `npx next build` → `✓ Compiled successfully`.
2. Manual (with the dev server running via the Claude Preview MCP tool):
   ```js
   const res = await fetch('/api/copyright', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ applicantName: 'A', workTitle: 'B' }), // deliberately invalid/incomplete
   });
   const data = await res.json();
   // Expect: res.status === 400, data.fieldErrors is a non-empty object
   ```

---

### Task 11: End-to-end manual verification

No code changes — this task confirms Tasks 1–10 work together. Use the Claude Preview MCP tool (`preview_start`, `preview_eval`, `preview_fill`, `preview_click`, `preview_snapshot`, `preview_resize`).

**Step 1: Start the preview server and open the page**

```js
window.location.href = "http://localhost:3000/ar/services/copyright";
```

**Step 2: Trigger and verify inline errors**

- Click into the "الاسم الرباعي" field, type one character, then blur (click elsewhere) → expect a red error message to appear under the field, the border to turn red, and `aria-invalid="true"` on the input (check via `preview_eval`: `document.getElementById('applicantName').getAttribute('aria-invalid')`).
- Type a valid name (3+ chars) → error should disappear immediately (no need to blur again).
- Repeat for `applicantPhone` (try `123` → error; try `0911234567` → no error) and `applicantEmail` (try `notanemail` → error; try `a@b.com` → no error).
- Switch "أصالة العمل" to "عمل مقتبس أو مترجم..." → confirm the two new fields (`originalWorkName`, `originalPermission`) appear and validate the same way.

**Step 3: Keyboard navigation**

- Click the name field, then press `Tab` repeatedly through the whole form. Confirm every control (including the file-upload cards and the role radio cards) shows a visible focus ring and is reachable in a sane order.

**Step 4: Submit with missing fields**

- Leave most fields empty (or invalid) and click "تأكيد البيانات والانتقال للدفع". Confirm: the page scrolls to and focuses the first invalid field, and a toast appears saying to fix the highlighted fields.

**Step 5: Mobile width**

```js
// via preview_resize tool, set viewport to 375x800
```
Walk through steps 1–4 at this width; confirm no horizontal overflow and the certificate signature block stacks vertically instead of cramming two columns.

**Step 6: Confirm no regressions in the already-fixed security/tracker flow**

- Submit a real test entry, pay the initial fee, confirm the tracker (`?code=...` lookup) still works exactly as it did before this plan (Tasks 1–10 didn't touch `/api/copyright`'s `GET`/`PUT` handlers or the tracker UI).
- Clean up: delete the test submission created during this check (same approach used in the earlier security-audit verification this session — a one-off `prisma.copyrightSubmission.delete()` via `node -e "..."`).

**No commit step** — this project is not a git repository (confirmed in the environment context), so there is no `git add`/`git commit` step in this plan. If the user later initializes git, these changes can be committed as a single feature commit at that point.
