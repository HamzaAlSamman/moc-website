-- Additive guided-document and structured-review storage for legal licenses.
-- Safe to re-run on PostgreSQL after 2026-07-31_legal_license_service.sql.

DO $$ BEGIN
  CREATE TYPE "LegalLicenseReviewStatus" AS ENUM (
    'PENDING', 'ACCEPTED', 'DEFICIENT', 'NOT_APPLICABLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "LegalLicenseAttachmentKind" ADD VALUE IF NOT EXISTS 'APPLICATION_DOCX';
ALTER TYPE "LegalLicenseAttachmentKind" ADD VALUE IF NOT EXISTS 'BYLAWS_PDF';
ALTER TYPE "LegalLicenseAttachmentKind" ADD VALUE IF NOT EXISTS 'BYLAWS_DOCX';
ALTER TYPE "LegalLicenseAttachmentKind" ADD VALUE IF NOT EXISTS 'REQUIREMENTS_CHECKLIST_PDF';
ALTER TYPE "LegalLicenseAttachmentKind" ADD VALUE IF NOT EXISTS 'TECHNICAL_SUMMARY_PDF';

ALTER TABLE "LegalLicenseApplication"
  ADD COLUMN IF NOT EXISTS "eligibilityAnswers" JSONB,
  ADD COLUMN IF NOT EXISTS "premisesAnswers" JSONB,
  ADD COLUMN IF NOT EXISTS "bylawAnswers" JSONB,
  ADD COLUMN IF NOT EXISTS "postLicenseDeclarations" JSONB,
  ADD COLUMN IF NOT EXISTS "requirementSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "deficiencyScopes" JSONB,
  ADD COLUMN IF NOT EXISTS "documentTemplateVersion" TEXT;

ALTER TABLE "LegalLicenseAttachment"
  ADD COLUMN IF NOT EXISTS "templateVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "LegalLicenseReviewItem" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "applicationRevision" INTEGER NOT NULL,
  "requirementKey" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "subjectRef" TEXT,
  "status" "LegalLicenseReviewStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "publicNote" TEXT,
  "reviewerId" TEXT,
  "reviewerEmail" TEXT,
  "reviewerName" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalLicenseReviewItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalLicenseReviewItem_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "LegalLicenseApplication"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalLicenseAttachment_verificationCode_key"
  ON "LegalLicenseAttachment"("verificationCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LLReview_app_revision_requirement_subject_key"
  ON "LegalLicenseReviewItem"("applicationId", "applicationRevision", "requirementKey", "subjectRef");
-- PostgreSQL treats NULL values as distinct in a regular unique index. This
-- partial index preserves logical uniqueness for application-level requirements.
CREATE UNIQUE INDEX IF NOT EXISTS "LLReview_app_revision_requirement_null_subject_key"
  ON "LegalLicenseReviewItem"("applicationId", "applicationRevision", "requirementKey")
  WHERE "subjectRef" IS NULL;
CREATE INDEX IF NOT EXISTS "LegalLicenseReviewItem_applicationId_applicationRevision_idx"
  ON "LegalLicenseReviewItem"("applicationId", "applicationRevision");