# Guided Legal-License Documents Design

**Date:** 2026-07-31
**Status:** Approved by the user
**Scope:** Upgrade the existing internally gated legal-license service; do not rebuild its workflow.

## Problem

The source package supplied by Legal Affairs is not a set of citizen-fillable forms. Six PDFs are scanned ministerial decisions or licensing conditions. The seventh is a 16-page model bylaw for cultural forums, cultural associations, and cultural houses. Asking citizens to read these files, copy text into Word, and upload edited documents creates avoidable errors, inconsistent versions, poor mobile usability, and a risk that mandatory legal clauses are changed or removed.

The service should collect facts and legally permitted choices through a guided web experience, retain the original decisions as downloadable references, and generate the official application documents for the citizen.

## Source classification

| Source | Use in the service |
|---|---|
| تراخيص الفن التشكيلي.pdf | Fine-arts eligibility, applicant evidence, premises, equipment, staffing, curriculum, records, and post-license obligations |
| تراخيص الفنون السينمائية.pdf | Cinema-arts eligibility, applicant evidence, premises, technical equipment, staffing, curriculum, records, and post-license obligations |
| تراخيص المتاحف التراثية.pdf | Museum applicant evidence, collection inventory/provenance, premises, display, protection, insurance, operation, and classification |
| تراخيص المعاهد المسرحية.pdf | Theater-institute applicant/director qualifications, premises, equipment, curriculum, staff, records, transfer, and sanctions |
| تراخيص المعاهد الموسيقية.pdf | Music-institute applicant/director qualifications, acoustic premises, equipment, curriculum, staff, records, transfer, and sanctions |
| شروط ترخيص ترخيص صالات العرض الخاصه بالفنون التشكيليه.pdf | Gallery applicant status, premises, artist contracts, display rules, commission limits, supervision, and sanctions |
| نظام نموذجي استرشادي.pdf | Locked model bylaw used to generate customized bylaws for cultural forums, associations, and houses |

The source PDFs will be copied unchanged to public/documents/legal-licenses/ with ASCII filenames. The configuration will store their public URL and decision/article references. The service remains behind the current password gate until Legal Affairs approves the transcribed requirements and templates.

## Chosen experience

The citizen never edits legal prose. The wizard becomes eight steps:

1. Service guide and license type.
2. Fast eligibility check.
3. Applicant, manager, and founders.
4. Entity, premises, and technical compliance.
5. Required evidence and uploads.
6. Model-bylaw choices when applicable.
7. Full review and generated-document preview.
8. Declarations, visual signature, and final submission.

Draft saving, the secret resume link, reference number, private attachments, optimistic concurrency, tracking, and the existing legal approval workflow remain in place.

A blocking eligibility answer does not destroy the draft. It explains the unmet condition, links to the source decision, and prevents final submission until the answer is corrected. Post-license obligations are shown as explicit declarations, not as evidence the applicant must upload during initial submission.

## Central requirement configuration

Create src/lib/legal-license-requirements.mjs as the single source of truth for:

- bilingual type guidance;
- source decision metadata and downloads;
- eligibility questions;
- applicant/manager/founder fields;
- application and founder attachments;
- premises and equipment questions;
- post-license declarations;
- whether a model bylaw is generated;
- the template version and source references.

Each requirement has a stable key, category, bilingual label/help text, response type, blocking flag, source document key, source article reference, and optional applicability rule. UI, API validation, checklist generation, PDF/DOCX generation, and admin review all consume the same configuration.

The ten existing LegalLicenseType values remain unchanged. Types without newly supplied type-specific conditions continue to use approved general requirements and are explicitly marked pending further official type guidance while the internal gate remains active.

## Data model

Extend LegalLicenseApplication with JSON snapshots rather than adding a column for every regulatory question:

- eligibilityAnswers
- premisesAnswers
- bylawAnswers
- requirementSnapshot
- deficiencyScopes
- documentTemplateVersion

A snapshot is frozen at each submission so later configuration changes cannot alter an archived application.

Add LegalLicenseReviewItem for structured review. It records application, application revision, stable requirement key, scope, subject reference, review status, internal note, public deficiency note, reviewer identity, and timestamps. Review rows are append-safe across revisions.

Extend generated attachment metadata with a template version and random public verification code. Add attachment kinds for application DOCX, bylaws PDF/DOCX, checklist PDF, and technical summary PDF. Existing private storage and authorization remain authoritative.

## Document generation

A shared normalized document model feeds both formats:

- unified license application;
- customized model bylaw when required;
- requirements/evidence checklist;
- premises and technical summary.

PDF continues to use Puppeteer, Qomra, ministry branding, A4 layout, and HTML escaping. True Word documents are generated with the docx package; HTML renamed to .doc is not acceptable.

Mandatory bylaw clauses are locked. Citizens can only provide variables or choose from options explicitly represented in the approved model. Each archived document includes the reference number, application revision, template version, generation date, and verification code. A public verification endpoint returns only non-sensitive metadata.

Final submission succeeds only if every required document is generated and written to private storage. If any generation, write, or database step fails, newly written files are cleaned up and the application remains editable in its previous state. Every resubmission creates a new document set; old versions are never overwritten.

## Deficiency handling

The reviewer marks individual sections, requirements, and attachments as accepted, deficient, or not applicable. Suspending a request requires at least one deficient item with a citizen-visible note.

Tracking shows the exact missing items. The citizen UI unlocks only the deficient scopes. The server independently rejects changes outside those scopes and restricts replacement uploads to deficient attachment kinds. Resubmission creates a new application revision and review set while preserving all prior history and generated documents.

## Administration

The existing status graph and roles remain unchanged. The detail page gains:

- eligibility and technical-compliance sections;
- source references;
- structured review controls;
- generated-document downloads;
- revision selector;
- side-by-side deficiency notes;
- clear readiness checks before each transition.

Admin and super-admin overrides remain constrained by the status graph and continue to create AuditLog entries.

## Security and privacy

- Citizen authorization remains reference number plus a high-entropy secret whose hash is stored.
- Upload MIME/signature checks, 5 MB per-file and 75 MB per-request limits remain.
- Generated DOCX uses a storage-only MIME mapping and is not added to citizen-upload allowlists.
- Citizen text is escaped in HTML and inserted as text nodes in DOCX.
- Verification exposes no national IDs, contact data, addresses, attachment names, or notes.
- No request or legal history can be permanently deleted through the application.
- The drawn signature remains a visual declaration, not a qualified electronic signature.

## Release and acceptance

The service stays marked “Coming Soon” and password gated until Legal Affairs approves:

1. every transcribed requirement and source reference;
2. required evidence for each license type;
3. the unified application;
4. the generated model bylaw;
5. checklist and technical-summary wording;
6. role actions and approval sequence.

Acceptance requires Arabic and English mobile/desktop checks, successful unit/API/document/admin tests, npx prisma validate, node --test, and npm run build. Public activation is a separate, explicit change after legal approval.
