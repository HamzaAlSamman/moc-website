# Business Logic Hardening Implementation Plan

> **For Codex:** Use test-driven development and verification-before-completion for every task.

**Goal:** Enforce the audited Critical and High business rules in backend, database, and tests.

**Architecture:** Central domain validators and transition policies are called by Next.js Route Handlers. Prisma performs scoped/conditional writes, while PostgreSQL constraints protect durable invariants.

**Tech Stack:** Next.js 16 Route Handlers, Node test runner, Zod 4, Prisma 6, PostgreSQL.

---

### Task 1: Current database-backed session

**Files:** `src/lib/dal.js`, `src/lib/dal.test.mjs`

1. Write failing tests for inactive users and stale JWT roles.
2. Run the tests and confirm the expected failures.
3. Make `verifySession` load the current user and reject inactive accounts.
4. Run the focused and full tests.

### Task 2: Copyright workflow and public DTO

**Files:** `src/lib/copyright-workflow.js`, `src/lib/copyright-workflow.test.mjs`, copyright route handlers.

1. Write failing role/state transition and redaction tests.
2. Implement the transition matrix and public DTO.
3. Replace unconditional workflow updates with conditional compare-and-set writes.
4. Verify focused tests.

### Task 3: Copyright validation, ZIP/Drive and persistence

**Files:** `src/lib/copyright-validation.js`, its tests, public copyright route/UI, `prisma/schema.prisma`, manual migration SQL.

1. Write failing tests for required documents, ZIP signatures/size, Drive URLs, derived-work persistence, and unique references.
2. Implement strict schemas and file validation.
3. Add model fields and database constraints.
4. Update the form to explain ZIP/Drive behavior.
5. Verify focused tests.

### Task 4: Event rules and permissions

**Files:** `src/lib/event-validation.js`, tests, event routes, permissions and taxonomy routes, migration SQL.

1. Write failing date/status/permission/transition tests.
2. Implement shared validation and atomic review.
3. Remove taxonomy management from `DIRECTORATE`.
4. Add the end-date database check.
5. Verify focused tests.

### Task 5: Public event submissions

**Files:** validation module/tests, public/admin routes, Prisma schema and migration.

1. Write failing tests for boolean conversion, required fields, center/governorate consistency, transitions, duplicate window, and soft delete.
2. Implement validation, duplicate lookup, transition policy, and soft-delete filtering.
3. Verify focused tests.

### Task 6: Post and media ownership

**Files:** post routes/preview, media route, domain tests.

1. Write failing tests for read scoping, publication-state ownership, and referenced-media deletion.
2. Implement scoped reads/status checks/reference checks.
3. Verify focused tests.

### Task 7: Full verification

1. Run all `node --test` suites.
2. Run Prisma validation/generation.
3. Run `npm run build`.
4. Inspect the final diff and report any remaining questions or migration steps.
