# Copyright Cultural-Center Delivery — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Insert a mandatory `pending_center_delivery` step into the copyright workflow — after the final fee is verified, the deposit copy is routed to the citizen's cultural center, and only a center-scoped officer confirming arrival releases the certificate (paper or electronic).

**Architecture:** One new `applicationStatus` value slotted between `final_review` and `completed`. A new `CULTURAL_CENTER_OFFICER` role, scoped to exactly one `CulturalCenter` via a new `User.assignedCenterId` FK, checked with a plain DB lookup inside the existing PATCH route (no session/JWT changes). Center assignment is a manual dropdown (filtered by governorate) — no auto-matching logic.

**Tech Stack:** Next.js (App Router, Turbopack), Prisma/PostgreSQL, plain Node test runner (`node --test`), React client components (existing patterns only — no new libraries).

**Design doc:** `docs/plans/2026-09-09-copyright-cultural-center-delivery-design.md` — read it first if anything below is ambiguous.

---

## Task 1: Prisma schema — new fields, new enum value, migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Edit the `CopyrightSubmission` model**

In `prisma/schema.prisma`, find the `CopyrightSubmission` model (starts at line 587). Add these fields right after `internalRefSetById` (after line 628, before the `deficiencyNote` comment block):

```prisma
  // Cultural-center delivery gate: the deposit copy is routed to the citizen's
  // nearest center before the certificate (paper or electronic) is released.
  // assignedCenterId is set when Finance dispatches (final_review →
  // pending_center_delivery); the rest are set together when the center
  // officer confirms arrival (pending_center_delivery → completed).
  assignedCenterId     String?
  assignedCenter       CulturalCenter? @relation(fields: [assignedCenterId], references: [id], onDelete: SetNull)
  centerDeliveryMethod String?   // "paper" | "electronic"
  centerConfirmedAt    DateTime?
  centerConfirmedById  String?
```

**Step 2: Edit the `User` model**

Find `model User` (line 298). Add right after `avatar String?` (line 305):

```prisma
  // Set only for CULTURAL_CENTER_OFFICER accounts — scopes that account to
  // exactly one cultural center's incoming copyright deliveries.
  assignedCenterId String?
  assignedCenter   CulturalCenter? @relation(fields: [assignedCenterId], references: [id], onDelete: SetNull)
```

**Step 3: Edit the `CulturalCenter` model**

Find `model CulturalCenter` (line 534). Prisma requires the back-relations to be declared explicitly. Add after `updatedAt DateTime @updatedAt` (line 539):

```prisma
  submissions CopyrightSubmission[]
  officers    User[]
```

**Step 4: Add the new `Role` enum value**

Find `enum Role` (line 10). Add before the closing `}` (after `LANGUAGE_IDENTITY_REVIEWER`, line 39):

```prisma
  // Scoped to exactly one CulturalCenter (User.assignedCenterId). Confirms a
  // copyright deposit copy arrived at their center and releases the
  // certificate — sees no other part of the panel.
  CULTURAL_CENTER_OFFICER
```

**Step 5: Generate and apply the migration**

```bash
npx prisma migrate dev --name copyright_cultural_center_delivery
```

Expected: prompts nothing destructive (all new nullable columns / new enum value), prints `Your database is now in sync with your schema.`, and creates a new folder under `prisma/migrations/`.

**Step 6: Regenerate the Prisma client**

```bash
npx prisma generate
```

**Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add cultural-center delivery fields to copyright workflow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Seed the missing cultural centers

**Files:**
- Modify: `prisma/seed-centers.js`

**Step 1: Add the new entries**

In `prisma/seed-centers.js`, the `CENTERS` array currently ends with the Idlib entry (line 99, `{ governorate: "إدلب", nameAr: "مديرية ثقافة إدلب" }`). Add these new entries right after it, before the closing `];` (line 100):

```js
  // ── مراكز التسليم الخاصة بمعاملات حقوق المؤلف ──
  // دمشق وريف دمشق تصبّان معاً في الوزارة مباشرة؛ كل محافظة أخرى تحصل على
  // مركز واحد واضح، حتى لا تبقى أي محافظة بلا خيار عند إرسال معاملة إليها.
  { governorate: "دمشق", nameAr: "وزارة الثقافة في دمشق" },
  { governorate: "ريف دمشق", nameAr: "وزارة الثقافة في دمشق" },
  { governorate: "حلب", nameAr: "المركز الثقافي في حلب" },
  { governorate: "حمص", nameAr: "المركز الثقافي في حمص" },
  { governorate: "حماة", nameAr: "المركز الثقافي في حماة" },
  { governorate: "اللاذقية", nameAr: "المركز الثقافي في اللاذقية" },
  { governorate: "طرطوس", nameAr: "المركز الثقافي في طرطوس" },
  { governorate: "السويداء", nameAr: "المركز الثقافي في السويداء" },
  { governorate: "درعا", nameAr: "المركز الثقافي في درعا" },
  { governorate: "القنيطرة", nameAr: "المركز الثقافي في القنيطرة" },
  { governorate: "دير الزور", nameAr: "المركز الثقافي في دير الزور" },
  { governorate: "الرقة", nameAr: "المركز الثقافي في الرقة" },
  { governorate: "الحسكة", nameAr: "المركز الثقافي في الحسكة" },
  { governorate: "إدلب", nameAr: "المركز الثقافي في إدلب" },
```

**Step 2: Run it against the dev database**

```bash
node prisma/seed-centers.js
```

Expected output ends with `Done! Created/verified: 14, Skipped: 0` (the pre-existing ~90 entries are untouched — the script only reports the ones it processes in this run, but since the script always iterates the *whole* `CENTERS` array, expect `Created/verified: <old count + 14>`).

**Step 3: Verify**

```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.culturalCenter.count({where:{governorate:'القنيطرة'}}).then(n=>{console.log('Quneitra centers:',n);p.\$disconnect()})"
```

Expected: `Quneitra centers: 1`

**Step 4: Commit**

```bash
git add prisma/seed-centers.js
git commit -m "feat: seed cultural centers for copyright delivery in every governorate

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Workflow graph — `business-rules.mjs` (TDD)

**Files:**
- Modify: `src/lib/business-rules.mjs:3-19`
- Test: `src/lib/business-rules.test.mjs`

**Step 1: Write the failing tests**

In `src/lib/business-rules.test.mjs`, replace the existing test at line 29-35 (`"copyright workflow is owned by the current stage role"`) with an expanded version that also covers the new step:

```js
test("copyright workflow is owned by the current stage role", () => {
  assert.equal(canTransitionCopyright("FINANCE", "finance_review", "under_review"), true);
  assert.equal(canTransitionCopyright("FINANCE", "submitted", "completed"), false);
  assert.equal(canTransitionCopyright("STUDIES_ASSESSOR", "finance_review", "under_review"), false);
  assert.equal(canTransitionCopyright("DEPUTY_MINISTER", "pending_final_approval", "pending_fees"), true);
  assert.equal(canTransitionCopyright("ADMIN", "submitted", "completed"), false);
});

test("final fee verification dispatches to a cultural center instead of completing directly", () => {
  assert.equal(canTransitionCopyright("FINANCE", "final_review", "pending_center_delivery"), true);
  assert.equal(canTransitionCopyright("FINANCE", "final_review", "completed"), false);
  assert.equal(canTransitionCopyright("ADMIN", "final_review", "pending_center_delivery"), true);
});

test("only a cultural center officer completes a delivery, and only from pending_center_delivery", () => {
  assert.equal(canTransitionCopyright("CULTURAL_CENTER_OFFICER", "pending_center_delivery", "completed"), true);
  assert.equal(canTransitionCopyright("CULTURAL_CENTER_OFFICER", "final_review", "completed"), false);
  assert.equal(canTransitionCopyright("FINANCE", "pending_center_delivery", "completed"), false);
  assert.equal(canTransitionCopyright("ADMIN", "pending_center_delivery", "completed"), true);
});
```

**Step 2: Run tests to verify they fail**

```bash
node --test src/lib/business-rules.test.mjs --test-name-pattern="cultural center|dispatches"
```

Expected: FAIL — `canTransitionCopyright("FINANCE", "final_review", "pending_center_delivery")` returns `false` (status/role not in the graph yet).

**Step 3: Update the workflow graph**

In `src/lib/business-rules.mjs`, replace lines 3-19:

```js
const COPYRIGHT_TRANSITIONS = {
  FINANCE: new Set(["finance_review:under_review", "final_review:pending_center_delivery", "finance_review:submitted", "final_review:pending_fees", "finance_review:rejected", "final_review:rejected"]),
  LEGAL_DIRECTOR: new Set(["under_review:pending_final_approval", "under_review:suspended", "under_review:rejected"]),
  STUDIES_ASSESSOR: new Set(["under_review:under_review", "under_review:suspended", "under_review:rejected"]),
  STUDIES_HEAD: new Set(["under_review:under_review", "under_review:suspended", "under_review:rejected"]),
  DEPUTY_MINISTER: new Set(["pending_final_approval:pending_fees", "pending_final_approval:suspended", "pending_final_approval:rejected"]),
  // Scoped to their own center by a DB lookup in the route handler (this graph
  // only knows roles and statuses, not which center a submission or officer
  // belongs to) — see PATCH /api/admin/copyright-submissions/[id].
  CULTURAL_CENTER_OFFICER: new Set(["pending_center_delivery:completed"]),
};

const COPYRIGHT_STATUS_GRAPH = {
  submitted: new Set(["finance_review"]),
  finance_review: new Set(["under_review", "submitted", "rejected"]),
  under_review: new Set(["suspended", "rejected", "pending_final_approval"]),
  suspended: new Set(["under_review"]),
  pending_final_approval: new Set(["pending_fees", "suspended", "rejected"]),
  pending_fees: new Set(["final_review"]),
  final_review: new Set(["pending_center_delivery", "pending_fees", "rejected"]),
  pending_center_delivery: new Set(["completed"]),
};
```

(Only two lines actually changed: `FINANCE`'s set gained `final_review:pending_center_delivery` in place of `final_review:completed`, `CULTURAL_CENTER_OFFICER` is new, and `final_review`/`pending_center_delivery` changed in the status graph — the rest is copied unchanged for context.)

**Step 4: Run tests to verify they pass**

```bash
node --test src/lib/business-rules.test.mjs
```

Expected: all tests PASS, including the two new ones and the pre-existing ones (unaffected).

**Step 5: Commit**

```bash
git add src/lib/business-rules.mjs src/lib/business-rules.test.mjs
git commit -m "feat: insert pending_center_delivery into the copyright workflow graph

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Role, labels, and permissions

**Files:**
- Modify: `src/lib/permissions.js`
- Test: `src/lib/business-rules-integration.test.mjs`

**Step 1: Write the failing test**

Append to `src/lib/business-rules-integration.test.mjs`:

```js
test("cultural center officers can view and act on copyright submissions", () => {
  const source = readFileSync(new URL("./permissions.js", import.meta.url), "utf8");
  const view = source.match(/VIEW_SUBMISSIONS:\s*\[([^\]]+)\]/)?.[1] ?? "";
  const manage = source.match(/MANAGE_SUBMISSIONS:\s*\[([^\]]+)\]/)?.[1] ?? "";
  assert.match(view, /CULTURAL_CENTER_OFFICER/);
  assert.match(manage, /CULTURAL_CENTER_OFFICER/);
});
```

This file uses `readFile` from `node:fs/promises` (async) via the `read()` helper at the top — but this new test reads synchronously for a one-line regex check, so add the sync import too. At the top of the file, change:

```js
import { readFile } from "node:fs/promises";
```

to:

```js
import { readFile, readFileSync } from "node:fs/promises";
```

**Step 2: Run to verify it fails**

```bash
node --test src/lib/business-rules-integration.test.mjs --test-name-pattern="cultural center officers"
```

Expected: FAIL — `CULTURAL_CENTER_OFFICER` not found in either permission list yet.

**Step 3: Add the role**

In `src/lib/permissions.js`, add to `ROLES` (after line 23, `LANGUAGE_IDENTITY_REVIEWER`):

```js
  CULTURAL_CENTER_OFFICER: "CULTURAL_CENTER_OFFICER",
```

Add to `ROLE_LABELS.ar` (after line 49):

```js
    CULTURAL_CENTER_OFFICER: "موظف المركز الثقافي",
```

Add to `ROLE_LABELS.en` (after line 73):

```js
    CULTURAL_CENTER_OFFICER: "Cultural Center Officer",
```

Do **not** add it to `ROLE_HIERARCHY` — same precedent as `TICKET_OFFICER`, a narrow single-purpose role that's intentionally left out (defaults to hierarchy level 0, so any `EDIT_USER`-holding admin can manage these accounts).

**Step 4: Add the permissions**

In `PERMISSIONS.VIEW_SUBMISSIONS` (line 202), append `ROLES.CULTURAL_CENTER_OFFICER`:

```js
  VIEW_SUBMISSIONS:   [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.EVENT_MANAGER, ROLES.STUDIES_ASSESSOR, ROLES.STUDIES_HEAD, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER, ROLES.FINANCE, ROLES.CULTURAL_CENTER_OFFICER],
```

In `PERMISSIONS.MANAGE_SUBMISSIONS` (line 203), same:

```js
  MANAGE_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EVENT_MANAGER, ROLES.STUDIES_ASSESSOR, ROLES.STUDIES_HEAD, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER, ROLES.FINANCE, ROLES.CULTURAL_CENTER_OFFICER],
```

In `PERMISSIONS.VIEW_DASHBOARD` (line 221), append it too, so login doesn't land on a permission error:

```js
  VIEW_DASHBOARD: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR, ROLES.CONTRIBUTOR, ROLES.VIEWER, ROLES.EVENT_MANAGER, ROLES.MEDIA_OFFICE, ROLES.STUDIES_ASSESSOR, ROLES.STUDIES_HEAD, ROLES.LEGAL_DIRECTOR, ROLES.DEPUTY_MINISTER, ROLES.LICENSING_OFFICER, ROLES.LICENSING_COMMITTEE, ROLES.FINANCE, ROLES.DIRECTORATE, ROLES.LANGUAGE_IDENTITY_REVIEWER, ROLES.CULTURAL_CENTER_OFFICER],
```

**Step 5: Run tests to verify they pass**

```bash
node --test src/lib/business-rules-integration.test.mjs
```

Expected: all PASS, including pre-existing tests in the file (unaffected).

**Step 6: Commit**

```bash
git add src/lib/permissions.js src/lib/business-rules-integration.test.mjs
git commit -m "feat: add CULTURAL_CENTER_OFFICER role and its copyright permissions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Sidebar nav scoping

**Files:**
- Modify: `src/components/admin/AdminSidebar.jsx:115-116`

**Step 1: Add the role to the copyright-only nav restriction**

In `src/components/admin/AdminSidebar.jsx`, change line 115:

```js
        : ["FINANCE", "STUDIES_ASSESSOR", "STUDIES_HEAD"].includes(role)
```

to:

```js
        : ["FINANCE", "STUDIES_ASSESSOR", "STUDIES_HEAD", "CULTURAL_CENTER_OFFICER"].includes(role)
```

This reuses the exact same restriction as Finance/Assessor/Head: only `/admin/copyright` and `/admin/dashboard` are reachable.

**Step 2: No automated test** — this is a plain array literal; covered by the manual QA checklist in Task 12.

**Step 3: Commit**

```bash
git add src/components/admin/AdminSidebar.jsx
git commit -m "feat: scope cultural center officer nav to copyright only

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: User management — assign a center to an officer account

**Files:**
- Modify: `src/lib/dal.js:35-44`
- Modify: `src/app/api/admin/users/route.js`
- Modify: `src/app/api/admin/users/[id]/route.js`
- Modify: `src/components/admin/UserForm.jsx`

**Step 1: Expose `assignedCenterId` on the logged-in user**

In `src/lib/dal.js`, `getCurrentUser()`'s `select` (lines 35-44) currently ends with `mustChangePassword: true,`. Add a line after it:

```js
      mustChangePassword: true,
      assignedCenterId: true,
```

**Step 2: Accept `assignedCenterId` on user creation**

In `src/app/api/admin/users/route.js`, the `POST` handler builds `data` for `prisma.user.create` at lines 42-50. Add a field:

```js
        role: userRole,
        isActive: data.isActive ?? true,
        createdById: session.role === "DIRECTORATE" ? session.userId : null,
        assignedCenterId: userRole === "CULTURAL_CENTER_OFFICER" ? (data.assignedCenterId || null) : null,
```

**Step 3: Accept `assignedCenterId` on user edit**

In `src/app/api/admin/users/[id]/route.js`, `PUT` handler: after the role-change block (ends at line 61, `updateData.role = data.role;` then closing `}`), add:

```js
  const effectiveRole = updateData.role ?? target.role;
  if (effectiveRole === "CULTURAL_CENTER_OFFICER") {
    if (!data.assignedCenterId) {
      return NextResponse.json({ error: "يجب اختيار المركز الثقافي لهذا الحساب" }, { status: 400 });
    }
    updateData.assignedCenterId = data.assignedCenterId;
  } else if (data.role && data.role !== "CULTURAL_CENTER_OFFICER") {
    // Role changed away from center officer — clear the stale assignment.
    updateData.assignedCenterId = null;
  }
```

Place this right before the `try {` block that calls `prisma.user.update` (line 80).

**Step 4: Add the center picker to the form**

In `src/components/admin/UserForm.jsx`:

Add `"CULTURAL_CENTER_OFFICER"` to `ALL_ROLES` (after line 23, `"LANGUAGE_IDENTITY_REVIEWER",`):

```js
  // Confirms a copyright deposit arrived at one specific cultural center and
  // releases the certificate. Scoped to that center via assignedCenterId.
  "CULTURAL_CENTER_OFFICER",
```

Add state for the centers list and the selected center, and fetch the list on mount. Change the `useState` import (line 3) to include `useEffect`:

```js
import { useState, useEffect } from "react";
```

Add to the `form` state (line 32-39), a new field:

```js
    role:     user?.role     ?? (currentUserRole === "DIRECTORATE" ? "TICKET_OFFICER" : "AUTHOR"),
    assignedCenterId: user?.assignedCenterId ?? "",
    isActive: user?.isActive ?? true,
```

Add a centers-loading effect right after the `useState` block (after line 39):

```js
  const [centers, setCenters] = useState([]);
  useEffect(() => {
    if (form.role !== "CULTURAL_CENTER_OFFICER") return;
    fetch("/api/admin/cultural-centers")
      .then((r) => r.json())
      .then((data) => setCenters(Array.isArray(data) ? data : []))
      .catch(() => setCenters([]));
  }, [form.role]);
```

Add validation in `handleSave` (after the existing checks around line 44-45):

```js
    if (form.role === "CULTURAL_CENTER_OFFICER" && !form.assignedCenterId) { setError("يرجى اختيار المركز الثقافي"); setSaving(false); return; }
```

Add the picker UI right after the role `<select>` block (after line 96, the closing `</div>` of the role field):

```jsx
          {form.role === "CULTURAL_CENTER_OFFICER" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">المركز الثقافي *</label>
              <select value={form.assignedCenterId} onChange={(e) => setForm((f) => ({ ...f, assignedCenterId: e.target.value }))} className={INPUT}>
                <option value="">اختر المركز...</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.governorate} — {c.nameAr}</option>
                ))}
              </select>
            </div>
          )}
```

**Step 5: No automated test** — this is a thin CRUD form mirroring an existing pattern exactly (`TICKET_OFFICER`'s own conditional constraints in the same file/routes). Covered by the manual QA checklist in Task 12.

**Step 6: Commit**

```bash
git add src/lib/dal.js src/app/api/admin/users/route.js src/app/api/admin/users/[id]/route.js src/components/admin/UserForm.jsx
git commit -m "feat: assign cultural center officers to their center on creation/edit

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Mailer — paper delivery confirmation email

**Files:**
- Modify: `src/lib/copyright-mailer.js:282-320`

**Step 1: Read the full `sendCompletedEmail` function** (already shown above, lines 282-320) to confirm the exact text to replace.

**Step 2: Branch the completed email by delivery method**

In `src/lib/copyright-mailer.js`, replace the body of `sendCompletedEmail` (lines 282-320) with:

```js
export async function sendCompletedEmail(submission) {
  if (submission.centerDeliveryMethod === "paper") {
    return sendCompletedPaperEmail(submission);
  }

  const fees = getFeesForMailer(submission.applicantRole);
  const attachments = await buildReceiptAttachment(submission, "final");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://moc.gov.sy";
  const trackingLink = `${appUrl}/ar/services/copyright?code=${submission.id}`;

  await dispatchEmail(submission, {
    subject: `🎓 صدرت شهادة حماية حقوق المؤلف — إيصال الرسم النهائي - #${submission.id}`,
    titleAr: "تهانينا! صدرت شهادة حماية حقوق المؤلف الرسمية",
    attachments,
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم تدقيق واعتماد الرسم النهائي (${fees.finalTotal}) وإصدار
        <strong>شهادة حماية حقوق المؤلف الرسمية</strong>
        للعمل <strong>«${esc(submission.workTitle)}»</strong> بصيغة قابلة للتحميل.
      </p>

      ${receiptNotice(attachments)}

      <div style="margin-top:20px;background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">🏅</div>
        <h4 style="color:#15803d;margin:0 0 8px 0;font-size:16px;">شهادتك الرسمية جاهزة للتحميل</h4>
        <p style="font-size:12px;color:#166534;margin:0 0 16px 0;">
          يمكنك تحميل شهادة حماية حقوق المؤلف بصيغة PDF من خلال صفحة تتبع الطلب
        </p>
        <a href="${trackingLink}"
           style="background-color:#15803d;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block;">
          تحميل الشهادة الرسمية (PDF)
        </a>
      </div>

      <div style="margin-top:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:13px;font-size:12px;color:#1e3a8a;line-height:1.6;">
        📌 احتفظ بهذه الرسالة وإيصال الدفع المرفق كوثائق رسمية. رقم المعاملة:
        <strong style="font-family:monospace;">${submission.id}</strong>
      </div>
    `,
  });
}

// Paper handoff already happened in person at the cultural center — no PDF
// attached here, just a confirmation the citizen can keep for their records.
async function sendCompletedPaperEmail(submission) {
  const fees = getFeesForMailer(submission.applicantRole);

  await dispatchEmail(submission, {
    subject: `🎓 استُلمت شهادة حماية حقوق المؤلف — #${submission.id}`,
    titleAr: "تهانينا! استُلمت شهادة حماية حقوق المؤلف الرسمية",
    contentHtml: `
      <p style="font-size:14px;">
        عزيزنا المودع <strong>${esc(submission.applicantName)}</strong>،<br/>
        تم تدقيق واعتماد الرسم النهائي (${fees.finalTotal})، وصدرت
        <strong>شهادة حماية حقوق المؤلف الرسمية</strong>
        للعمل <strong>«${esc(submission.workTitle)}»</strong> وسُلّمت نسخة ورقية منها من المركز الثقافي المعتمد.
      </p>

      <div style="margin-top:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:13px;font-size:12px;color:#1e3a8a;line-height:1.6;">
        📌 احتفظ بالشهادة الورقية كوثيقة رسمية. رقم المعاملة:
        <strong style="font-family:monospace;">${submission.id}</strong>
      </div>
    `,
  });
}
```

**Step 3: No automated test** — this mirrors the untested sibling functions already in this file (`sendPendingFinalApprovalEmail`, etc.); covered by the manual QA checklist in Task 12, which checks the pm2/dev log for the outgoing mail (the queued-mail sender logs subjects — verify by grep as noted there).

**Step 4: Commit**

```bash
git add src/lib/copyright-mailer.js
git commit -m "feat: send an attachment-free confirmation when a certificate is delivered on paper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Notify only the officers of the target center

**Files:**
- Modify: `src/lib/notify.js`

**Step 1: Add a center-scoped fan-out helper**

In `src/lib/notify.js`, append after `notifyByRole` (end of file, after line 77):

```js

/**
 * Targeted fan-out — notifies only the CULTURAL_CENTER_OFFICER account(s)
 * assigned to one specific center. Unlike notifyByRole (which pings every
 * holder of a role), a copyright dispatch matters to exactly one center's
 * staff, not every officer at every center.
 */
export async function notifyCenterOfficers(centerId, { type, titleAr, titleEn = null, link = null }) {
  if (!centerId) return;
  try {
    const recipients = await prisma.user.findMany({
      where: { isActive: true, role: "CULTURAL_CENTER_OFFICER", assignedCenterId: centerId },
      select: { id: true },
    });
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((u) => ({ userId: u.id, type, titleAr, titleEn, link })),
    });
  } catch (err) {
    console.error("Center-officer notification fan-out failed:", err);
  }
}
```

**Step 2: No automated test** — mirrors the untested `notifyByRole` right above it; covered by the manual QA checklist in Task 12.

**Step 3: Commit**

```bash
git add src/lib/notify.js
git commit -m "feat: add a center-scoped notification fan-out for copyright dispatch

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: PATCH route — dispatch, confirm, and scope enforcement

**Files:**
- Modify: `src/app/api/admin/copyright-submissions/[id]/route.js`

**Step 1: Add the new status to the allow-list**

Change lines 22-32:

```js
const ALLOWED_STATUSES = [
  "submitted",
  "finance_review",
  "under_review",
  "suspended",
  "rejected",
  "pending_final_approval",
  "pending_fees",
  "final_review",
  "pending_center_delivery",
  "completed",
];
```

**Step 2: Accept the two new request fields**

Change the field-length validation loop (lines 47-51) to also cover `assignedCenterId` and `centerDeliveryMethod`:

```js
  for (const field of ["applicationStatus", "assessorReportFile", "studiesRecommendationsFile", "reviewNote", "deficiencyNote", "internalRefNumber", "assignedCenterId", "centerDeliveryMethod"]) {
    if (data[field] !== undefined && (typeof data[field] !== "string" || data[field].length > 20000)) {
      return NextResponse.json({ error: `قيمة غير صالحة: ${field}` }, { status: 400 });
    }
  }
```

Change the destructuring (lines 52-59) to also pull the two new fields:

```js
  const {
    applicationStatus,
    assessorReportFile,
    studiesRecommendationsFile,
    reviewNote,
    deficiencyNote,
    internalRefNumber,
    assignedCenterId,
    centerDeliveryMethod,
  } = data;
```

**Step 3: Validate the dispatch and confirm steps**

Add this block right after the existing fee-payment guard (after line 120, `}`, before `const updateData = {};`):

```js
  // Dispatch to a center: Finance/Admin must name a specific CulturalCenter —
  // there is no auto-selection, and an empty target would leave the record
  // stuck with nowhere for the confirming officer to look.
  if (applicationStatus === "pending_center_delivery" && !assignedCenterId?.trim()) {
    return NextResponse.json({ error: "يجب اختيار المركز الثقافي قبل الإرسال" }, { status: 400 });
  }

  // Confirm arrival + release: the officer must record how the certificate
  // left their hands (this is what the completed-email branch below reads).
  if (applicationStatus === "completed" && existing.applicationStatus === "pending_center_delivery"
    && !["paper", "electronic"].includes(centerDeliveryMethod)) {
    return NextResponse.json({ error: "يجب تحديد طريقة تسليم الشهادة (ورقية أو إلكترونية)" }, { status: 400 });
  }

  // Scope enforcement: a center officer may only confirm a delivery addressed
  // to their own center. Not expressible in canTransitionCopyright (which only
  // knows roles and statuses) — same pattern as the STUDIES_ASSESSOR/HEAD/
  // LEGAL_DIRECTOR "owner" check further up this file.
  if (session.role === "CULTURAL_CENTER_OFFICER" && applicationStatus === "completed") {
    const officer = await prisma.user.findUnique({ where: { id: session.userId }, select: { assignedCenterId: true } });
    if (!officer?.assignedCenterId || officer.assignedCenterId !== existing.assignedCenterId) {
      return NextResponse.json({ error: "هذه المعاملة ليست مُرسلة إلى مركزك" }, { status: 403 });
    }
  }
```

**Step 4: Persist the new fields**

In the `updateData` block (lines 122-131), add after `if (isPaymentCorrection) updateData.paymentStatus = ...` (line 126):

```js
  if (applicationStatus === "pending_center_delivery") updateData.assignedCenterId = assignedCenterId.trim();
  if (applicationStatus === "completed" && existing.applicationStatus === "pending_center_delivery") {
    updateData.centerDeliveryMethod = centerDeliveryMethod;
    updateData.centerConfirmedAt = new Date();
    updateData.centerConfirmedById = session.userId;
  }
```

**Step 5: Notify the center on dispatch**

In the notification block near the end of the handler (after line 253, the `else if (applicationStatus === "pending_final_approval")` branch, before its closing `}`), add a new branch:

```js
  } else if (applicationStatus === "pending_center_delivery") {
    // Dispatched to a specific center — only that center's officer(s) need to
    // know, not the whole review chain.
    const { notifyCenterOfficers } = await import("@/lib/notify");
    await notifyCenterOfficers(updated.assignedCenterId, {
      type: "COPYRIGHT_CENTER_DELIVERY",
      titleAr: `معاملة قادمة إلى مركزكم: ${title}`,
      titleEn: `Submission incoming to your center: ${title}`,
      link,
    });
  }
```

(This uses a dynamic `import()` because the top of the file only imports `notifyByRole` from `@/lib/notify` — simpler to add `notifyCenterOfficers` to the existing static import instead. Do that: change the top-of-file import at line 14 from `import { notifyByRole } from "@/lib/notify";` to:)

```js
import { notifyByRole, notifyCenterOfficers } from "@/lib/notify";
```

(and use `notifyCenterOfficers(...)` directly in the branch above, without the dynamic `import()` line.)

**Step 6: No automated test for this task** — the route is already covered by the static source-grep pattern in `business-rules-integration.test.mjs` (Task 4 extended it); a full request/response test would need a live database, which this repo's test suite deliberately avoids for admin routes. Covered by the manual QA checklist in Task 12.

**Step 7: Commit**

```bash
git add src/app/api/admin/copyright-submissions/[id]/route.js
git commit -m "feat: dispatch-to-center and confirm-delivery actions on the copyright route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Admin pages — fetch centers, scope the officer's view

**Files:**
- Modify: `src/app/admin/copyright/page.js`
- Modify: `src/app/admin/copyright/[id]/page.js`

**Step 1: Scope the list page for center officers**

In `src/app/admin/copyright/page.js`, the `findMany` call (lines 26-36) currently has no `where`. Add one, and pass the centers list through for consistency with the detail page (not strictly required by the list UI today, but keeps both pages sourcing centers the same way — actually the list page doesn't need the centers list at all, skip that; only add scoping):

```js
  const submissions = await prisma.copyrightSubmission.findMany({
    where: user.role === "CULTURAL_CENTER_OFFICER" ? { assignedCenterId: user.assignedCenterId } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      applicantName: true,
      workTitle: true,
      workCategory: true,
      applicationStatus: true,
      createdAt: true,
    },
  });
```

**Step 2: Scope and enrich the detail page**

In `src/app/admin/copyright/[id]/page.js`, replace the whole file:

```js
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";
import CopyrightDetailView from "@/components/admin/CopyrightDetailView";
import { can } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";

export const metadata = {
  title: "تفاصيل معاملة حماية حق المؤلف - لوحة التحكم",
};

export default async function AdminCopyrightDetailPage(props) {
  const params = await props.params;
  const user = await getCurrentUser();

  if (!can(user.role, "VIEW_SUBMISSIONS")) {
    redirect("/admin/dashboard");
  }

  const { id } = params;
  const submission = await prisma.copyrightSubmission.findUnique({
    where: { id },
  });

  if (!submission) {
    notFound();
  }

  // A center officer may open only the cases routed to their own center —
  // everything before pending_center_delivery has no assignedCenterId yet, so
  // this also correctly hides cases that haven't reached their stage.
  if (user.role === "CULTURAL_CENTER_OFFICER" && submission.assignedCenterId !== user.assignedCenterId) {
    redirect("/admin/copyright");
  }

  // Centers list for the dispatch dropdown, pre-filtered to this submission's
  // governorate — fetched here (not client-side) so it's ready on first paint.
  const centers = await prisma.culturalCenter.findMany({
    where: { governorate: submission.province },
    orderBy: { nameAr: "asc" },
  });

  return (
    <AdminShell user={user} fullWidth={true}>
      <CopyrightDetailView submission={submission} currentUser={user} centers={centers} />
    </AdminShell>
  );
}
```

**Step 3: No automated test** — server components doing a Prisma read + redirect; covered by the manual QA checklist in Task 12.

**Step 4: Commit**

```bash
git add src/app/admin/copyright/page.js "src/app/admin/copyright/[id]/page.js"
git commit -m "feat: scope copyright pages to a center officer's own center

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: `CopyrightManager.jsx` — status label for the list/stat view

**Files:**
- Modify: `src/components/admin/CopyrightManager.jsx`

**Step 1: Add the label and color class**

In `src/components/admin/CopyrightManager.jsx`, add to `STATUS_LABELS` (after line 37, `final_review: "قيد التدقيق المالي للرسم النهائي",`):

```js
  pending_center_delivery: "بانتظار التسليم عبر المركز الثقافي",
```

Add to `STATUS_CLASSES` (after line 48, the `final_review` entry):

```js
  pending_center_delivery: "bg-purple-50 text-purple-700 border-purple-200",
```

**Step 2: Fold the new status into the "under review" stat bucket**

In `src/app/admin/copyright/page.js` (already open from Task 10), the `STAFF_ACTION_STATUSES` array (line 41) currently reads:

```js
  const STAFF_ACTION_STATUSES = ["finance_review", "under_review", "pending_final_approval", "final_review"];
```

Change to:

```js
  const STAFF_ACTION_STATUSES = ["finance_review", "under_review", "pending_final_approval", "final_review", "pending_center_delivery"];
```

(This keeps the "قيد المراجعة" stat chip counting every case still in staff hands, including ones now waiting on a center — it was already the "not done, not the citizen's turn" bucket.)

**Step 3: No automated test** — plain object literals; covered by the manual QA checklist in Task 12.

**Step 4: Commit**

```bash
git add src/components/admin/CopyrightManager.jsx src/app/admin/copyright/page.js
git commit -m "feat: show the cultural-center delivery status in the copyright list

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: `CopyrightDetailView.jsx` — dispatch card and confirm card

**Files:**
- Modify: `src/components/admin/CopyrightDetailView.jsx`

**Step 1: Accept the new `centers` prop**

Change the component signature (line 302):

```js
export default function CopyrightDetailView({ submission, currentUser, centers = [] }) {
```

**Step 2: Add state for the dispatch/confirm forms**

After the existing `useState` declarations (after line 319, `const [decisionNote, setDecisionNote] = useState("");`), add:

```js
  // Finance/Admin picks the destination center when dispatching.
  const [selectedCenterId, setSelectedCenterId] = useState("");
  // Center officer records how they handed the certificate over.
  const [deliveryMethod, setDeliveryMethod] = useState("");
```

**Step 3: Add the labels, color tokens, and workflow-stepper entry**

In `STATUS_LABELS` (after line 36, `final_review: "قيد التدقيق المالي للرسم النهائي",`):

```js
  pending_center_delivery: "بانتظار التسليم عبر المركز الثقافي",
```

In `STATUS_TOKENS` (after line 77, the `final_review` entry):

```js
  pending_center_delivery: { pill: "bg-purple-50 text-purple-750 border-purple-200", bar: "bg-purple-500" },
```

In `WORKFLOW_STEPS` (after line 151, `{ key: "final_finance", label: "تدقيق المالية للرسم النهائي" },`), insert a new step before `completed`:

```js
  { key: "center_delivery", label: "الإرسال إلى المركز الثقافي وتأكيد الاستلام" },
```

Update `getStepIndex` (lines 183-196) to place the new step at index 8 and push `completed` to 9:

```js
function getStepIndex(sub) {
  const s = sub.applicationStatus;
  if (s === "completed") return 9;
  if (s === "pending_center_delivery") return 8;
  if (s === "final_review") return 7;
  if (s === "pending_fees") return 6;
  if (s === "pending_final_approval") return 5;
  if (s === "under_review" || s === "suspended") {
    if (sub.assessorReportFile && sub.studiesRecommendationsFile) return 4;
    if (sub.assessorReportFile) return 3;
    return 2;
  }
  if (s === "finance_review") return 1;
  return 0; // submitted / rejected
}
```

**Step 4: Show which center a submission is headed to / arrived at**

In the "بيانات المصنف الفكري" subsection, right after the "مركز ومحافظة الإيداع" block (after line 663, the closing `</div>` of that field), add a new field that only renders once a center is assigned:

```jsx
                {sub.assignedCenter && (
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-slate-400 text-xs block font-semibold">المركز الثقافي لتسليم الشهادة</span>
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                      {sub.assignedCenter.governorate} — {sub.assignedCenter.nameAr}
                      {sub.centerConfirmedAt && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          وصل {sub.centerDeliveryMethod === "paper" ? "— سُلّم ورقياً" : "— سُلّم إلكترونياً"}
                        </span>
                      )}
                    </p>
                  </div>
                )}
```

This needs `sub.assignedCenter` to exist on the object the page passes in — the detail page's `prisma.copyrightSubmission.findUnique({ where: { id } })` from Task 10 does **not** currently `include` the relation. Go back to `src/app/admin/copyright/[id]/page.js` and change:

```js
  const submission = await prisma.copyrightSubmission.findUnique({
    where: { id },
  });
```

to:

```js
  const submission = await prisma.copyrightSubmission.findUnique({
    where: { id },
    include: { assignedCenter: true },
  });
```

**Step 5: Add the dispatch card (at `final_review`, replacing the direct "complete" button)**

Replace the entire "5. Final finance review" block (lines 1213-1244) with:

```jsx
              {/* 5. Final finance review — verify the final fee, then dispatch to a center */}
              {sub.applicationStatus === "final_review" && (
                <>
                  {(currentUser?.role === "FINANCE" || !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") ? (
                    <div className="space-y-3">
                      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-800 font-semibold flex gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
                        <p>سدّد المواطن الرسم النهائي ({fees.final}). يرجى تدقيق إيصال الدفع المرفق، ثم اختيار المركز الثقافي الذي سيُرسل إليه المصنف قبل إصدار الشهادة.</p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs text-slate-550 font-bold block">المركز الثقافي *:</span>
                        <select
                          value={selectedCenterId}
                          onChange={(e) => setSelectedCenterId(e.target.value)}
                          className="w-full text-xs border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          <option value="">اختر المركز...</option>
                          {centers.map((c) => (
                            <option key={c.id} value={c.id}>{c.nameAr}</option>
                          ))}
                        </select>
                        {centers.length === 0 && (
                          <p className="text-[11px] text-rose-600 font-semibold">
                            لا يوجد مركز ثقافي مسجل لمحافظة «{sub.province}» بعد — يرجى إضافته أولاً من صفحة{" "}
                            <a href="/admin/cultural-centers" target="_blank" rel="noopener noreferrer" className="underline">إدارة المراكز الثقافية</a>.
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleAction(sub.id, "pending_center_delivery", { assignedCenterId: selectedCenterId })}
                        disabled={!!actionLoading || !selectedCenterId}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === "pending_center_delivery" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإرسال...</> : "تأكيد استلام الرسم النهائي وإرسال المصنف للمركز"}
                      </button>
                      <button
                        onClick={() => handleAction(sub.id, "pending_fees")}
                        disabled={!!actionLoading}
                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                      >
                        {actionLoading === "pending_fees" ? "جارٍ الإعادة..." : "إعادة للمطالبة بالرسم (إيصال غير سليم)"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                      <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                      <p>المعاملة حالياً لدى قسم المالية للتحقق من تسديد الرسم النهائي قبل إرسالها للمركز الثقافي.</p>
                    </div>
                  )}
                </>
              )}

              {/* 5b. Pending center delivery — the officer of the assigned center confirms arrival */}
              {sub.applicationStatus === "pending_center_delivery" && (
                <>
                  {(currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN"
                    || (currentUser?.role === "CULTURAL_CENTER_OFFICER" && currentUser?.assignedCenterId === sub.assignedCenterId)) ? (
                    <div className="space-y-3">
                      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs text-purple-800 font-semibold flex gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                        <p>بانتظار وصول المصنف إلى «{sub.assignedCenter?.nameAr}». عند وصوله، أكّد الاستلام وحدّد طريقة تسليم الشهادة للمواطن.</p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs text-slate-550 font-bold block">طريقة تسليم الشهادة *:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod("paper")}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              deliveryMethod === "paper" ? "bg-[#003D33] text-white border-[#003D33]" : "bg-white text-slate-600 border-slate-250 hover:border-[#003D33]/40"
                            }`}
                          >
                            ورقياً (حضور شخصي)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod("electronic")}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              deliveryMethod === "electronic" ? "bg-[#003D33] text-white border-[#003D33]" : "bg-white text-slate-600 border-slate-250 hover:border-[#003D33]/40"
                            }`}
                          >
                            إلكترونياً (PDF بالبريد)
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAction(sub.id, "completed", { centerDeliveryMethod: deliveryMethod })}
                        disabled={!!actionLoading || !deliveryMethod}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === "completed" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التأكيد...</> : "تأكيد الاستلام وإصدار الشهادة"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                      <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                      <p>المعاملة حالياً بانتظار تأكيد استلام المصنف من «{sub.assignedCenter?.nameAr || "المركز الثقافي المعني"}».</p>
                    </div>
                  )}
                </>
              )}
```

`CONFIRM_MESSAGES.completed` (line 122) still applies (it fires a `window.confirm` regardless of which prior status led to `completed`) — no change needed there, it reads fine for both the old and new path.

**Step 6: No automated test** — this is a client component wired to the route from Task 9; verified end-to-end in the manual QA checklist below.

**Step 7: Commit**

```bash
git add src/components/admin/CopyrightDetailView.jsx "src/app/admin/copyright/[id]/page.js"
git commit -m "feat: dispatch-to-center and confirm-delivery UI on the copyright detail view

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 13: Full run and manual QA

**Step 1: Run the whole unit-test suite touched by this feature**

```bash
node --test src/lib/business-rules.test.mjs src/lib/business-rules-integration.test.mjs
```

Expected: all PASS.

**Step 2: Build check**

```bash
npm run build
```

Expected: builds clean (this also catches any JSX/typo mistakes in the two large client components edited in Task 12).

**Step 3: Manual walkthrough** (use `@run` or start the dev server directly — see `AGENTS.md`/`CLAUDE.md` for the project's own dev-server conventions)

1. Log in as `admin@moc.gov.sy` (seeded by `prisma/seed.js`). Create a test `CULTURAL_CENTER_OFFICER` user via `/admin/users`, assigning it to "المركز الثقافي في القنيطرة" (or any seeded center). Confirm the center picker only appears for that role and the save fails without a center selected.
2. Walk a copyright submission through the workflow (seed one via the citizen-facing form at `/ar/services/copyright`, or reuse an existing `submitted` one) up to `final_review` as `FINANCE`/`admin`.
3. At `final_review`, confirm: the center dropdown lists only centers matching the submission's province; picking one and confirming moves the status to `pending_center_delivery` and the label "بانتظار التسليم عبر المركز الثقافي" shows in both the list and detail view.
4. Log in as the test center officer. Confirm `/admin/copyright` shows only this one submission (scoped), and the sidebar shows only "لوحة التحكم" + "حقوق المؤلف".
5. Confirm a DIFFERENT center's officer (create a second test account for a different center) does **not** see this submission in their list, and hitting `/admin/copyright/<id>` directly redirects them to `/admin/copyright`.
6. As the correct officer, open the submission, pick a delivery method, confirm — status becomes `completed`. Check the dev server log for the outgoing mail:
   ```bash
   # adjust the log source to whatever the dev workflow prints to (queued-mail
   # worker) — grep for the submission's subject line
   ```
   Confirm the "paper" path logs/sends the attachment-free email, and repeat with "electronic" on a second submission to confirm the PDF-attached email is unchanged from before this feature.
7. Confirm the in-app notification bell shows the dispatch notice only for the assigned center's officer account, not for other staff.

**Step 4: Update `docs/plans/2026-09-09-copyright-cultural-center-delivery-design.md`** if manual QA surfaces a deviation from the design — otherwise leave it as the historical record of what was decided.

**Step 5: Final commit** (only if Step 3 required follow-up fixes not already committed per-task)

```bash
git add -A
git commit -m "fix: address manual QA findings for cultural-center delivery workflow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
