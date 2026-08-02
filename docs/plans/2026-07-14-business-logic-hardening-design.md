# Business Logic Hardening Design

**Scope:** Critical and High findings from the 2026-07-14 business-logic audit.

## Decisions

- `DIRECTORATE` creates events and may act only on its own events; it does not manage event taxonomies or cultural centers.
- Authors may edit the content of their published posts directly, but only `PUBLISH_POST` holders may change publication state.
- Event-submission deletion is soft deletion.
- Duplicate public event submissions are rejected for 15 minutes when applicant email/phone and event name match.
- `paymentRef` and `internalRefNumber` are globally unique.
- Public copyright tracking returns a safe DTO without attachments or internal review data. Citizen attachment replacement is allowed only while resubmitting a suspended case.
- Work uploads are ZIP files up to 100 MiB. Larger works use a validated Google Drive URL.

## Architecture

Business rules live in small server-side domain modules and Zod schemas rather than UI components. Route handlers authenticate against the current database user, call domain validation, and perform state transitions with conditional `updateMany` operations so concurrent requests cannot both win. Database constraints provide a final integrity boundary for uniqueness, date ordering, and soft-delete metadata.

## Main flows

### Authentication

`verifySession` validates the signed token, loads the user, rejects missing/inactive accounts, and returns the current database role. Page and API authorization therefore share the same current identity.

### Copyright

The workflow transition table maps current status, requested status/action, and owning role. Required documents are validated by applicant role, work category, identity-document type, and joint authors. Files are decoded and checked for size and signature; work content is either a ZIP up to 100 MiB or a Drive URL. Public responses use a redacted DTO. Payment and internal reference uniqueness is enforced in PostgreSQL and mapped to 409 responses.

### Events and submissions

Event schemas reject invalid dates, end-before-start, and time/status contradictions. Review transitions use compare-and-set updates. Event-submission input uses strict enums and cross-field checks, resolves cultural-center ownership, prevents short-window duplicates, and uses `deletedAt/deletedById` instead of physical deletion.

### Posts and media

Post reads are scoped by `VIEW_ANY_POST` or ownership. Authors can edit published content but cannot change publication status. Media deletion checks references across post and event fields and returns 409 when in use.

## Testing

Node test files exercise pure domain functions first, followed by route/service tests for current-user authorization, legal/illegal transitions, date relationships, file rules, public DTO redaction, soft deletion, uniqueness, and compare-and-set concurrency. Final verification runs all Node tests and `npm run build`.
