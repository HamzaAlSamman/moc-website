-- Baseline migration. Consolidates the project's real schema history, most
-- of which was applied via `prisma db push` plus hand-written SQL in
-- prisma/migrations_manual/ rather than through `prisma migrate`. The two
-- migration folders that previously lived here
-- (20260714120000_business_logic_hardening, 20260719113000_opera_event_sync)
-- were non-replayable deltas that assumed tables no `prisma migrate`
-- history had ever created — running `migrate deploy` against a fresh
-- database failed with "the underlying table for model X does not exist."
--
-- This file was generated with:
--   npx prisma migrate diff --from-empty \
--     --to-url <the actual dev database> --script
-- (introspecting the live database rather than schema.prisma, so that
-- schema drift not expressible in the Prisma schema language is captured
-- too) and then hand-verified against a fresh empty database until
-- `prisma migrate diff --from-url <freshly-baselined-db> --to-schema-datamodel
-- prisma/schema.prisma` reported an empty diff.
--
-- Two constructs Prisma's diff engine cannot represent at all — and so
-- silently omits even when introspecting a live database — are appended by
-- hand at the end of this file: the `Event_endDate_after_startDate` CHECK
-- constraint and the `LLReview_app_revision_requirement_null_subject_key`
-- partial unique index. Both originated in prisma/migrations_manual/.
--
-- Any environment whose database already has this exact schema (this
-- project's local dev DB, and — pending manual verification, see the
-- deployment runbook — production) must NOT run this file. Instead run:
--   npx prisma migrate resolve --applied 20260802090000_baseline_pre_citizen_booking
-- to record it as already-satisfied without touching the database.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."EntityType" AS ENUM ('DIRECTORATE', 'GOVERNMENT', 'EXTERNAL', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "public"."EventReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."LegalLicenseAttachmentKind" AS ENUM ('NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'CRIMINAL_RECORD', 'RESIDENCE_DOCUMENT', 'PERSONAL_PHOTO', 'AUTHORIZATION', 'FOUNDERS_MINUTES', 'ACTIVITY_PLAN', 'OWNERSHIP_OR_LEASE', 'FLOOR_PLAN', 'SAFETY_APPROVAL', 'ARTICLES_OF_ASSOCIATION', 'MEMBERS_LIST', 'ARTISTIC_PROGRAM', 'PROFESSIONAL_CERTIFICATE', 'EQUIPMENT_LIST', 'ARTWORK_PORTFOLIO', 'COLLECTION_INVENTORY', 'COLLECTION_PROVENANCE', 'ACADEMIC_QUALIFICATION', 'PROGRAM_AND_CURRICULUM', 'GALLERY_PROGRAM', 'APPLICATION_PDF', 'ISSUED_LICENSE', 'APPLICATION_DOCX', 'BYLAWS_PDF', 'BYLAWS_DOCX', 'REQUIREMENTS_CHECKLIST_PDF', 'TECHNICAL_SUMMARY_PDF');

-- CreateEnum
CREATE TYPE "public"."LegalLicenseReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DEFICIENT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "public"."LegalLicenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'SUSPENDED', 'LEGAL_APPROVAL', 'MINISTER_APPROVAL', 'APPROVED', 'REJECTED', 'LICENSE_ISSUED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."LegalLicenseType" AS ENUM ('CULTURAL_FORUM', 'CULTURAL_HOUSE', 'CULTURAL_ASSOCIATION', 'AMATEUR_TROUPE', 'CINEMA_ARTS', 'FINE_ARTS', 'HERITAGE_MUSEUM', 'MUSIC_INSTITUTE', 'THEATER_INSTITUTE', 'FINE_ARTS_GALLERY');

-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."PostType" AS ENUM ('NEWS', 'ANNOUNCEMENT', 'ACHIEVEMENT', 'PAGE');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CONTRIBUTOR', 'VIEWER', 'EVENT_MANAGER', 'MEDIA_OFFICE', 'SUPERVISOR', 'ASSISTANT', 'STUDIES', 'AUDITOR', 'STUDIES_ASSESSOR', 'STUDIES_HEAD', 'LEGAL_DIRECTOR', 'DEPUTY_MINISTER', 'FINANCE', 'DIRECTORATE', 'LICENSING_OFFICER', 'LICENSING_COMMITTEE');

-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'CONDITIONAL', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "targetId" TEXT,
    "targetEmail" TEXT,
    "ipAddress" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CopyrightSubmission" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantPhone" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantRole" TEXT NOT NULL,
    "workTitle" TEXT NOT NULL,
    "workCategory" TEXT NOT NULL,
    "workDesc" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "center" TEXT NOT NULL,
    "completionDate" TEXT NOT NULL,
    "hasTelecomDoc" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "applicationStatus" TEXT NOT NULL DEFAULT 'submitted',
    "applicantSignature" TEXT,
    "reviewerSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authors" JSONB,
    "paymentGateway" TEXT DEFAULT 'syriatel_cash',
    "paymentReceipt" TEXT,
    "paymentRef" TEXT,
    "assessorReportFile" TEXT,
    "commercialRegisterFile" TEXT,
    "delegationFile" TEXT,
    "originalOwnerIdFile" TEXT,
    "representativeIdFile" TEXT,
    "studiesRecommendationsFile" TEXT,
    "roleFile" TEXT,
    "telecomFile" TEXT,
    "workFile" TEXT,
    "idFileFront" TEXT,
    "idFileBack" TEXT,
    "idDocType" TEXT NOT NULL DEFAULT 'national_id',
    "deficiencyNote" TEXT,
    "internalRefNumber" TEXT,
    "internalRefSetById" TEXT,
    "reviewNotes" JSONB,
    "workDriveUrl" TEXT,
    "workOrigin" TEXT,
    "originalWorkName" TEXT,
    "originalPermission" TEXT,
    "referenceNo" TEXT,

    CONSTRAINT "CopyrightSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CulturalCenter" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "governorate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CulturalCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "location" TEXT,
    "locationEn" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "featuredImage" TEXT,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "governorate" TEXT,
    "governorateEn" TEXT,
    "eventCategoryId" TEXT,
    "eventKindId" TEXT,
    "createdById" TEXT,
    "rejectionReason" TEXT,
    "reviewStatus" "public"."EventReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "bookingUrl" TEXT,
    "externalId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MOC',
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventCategory" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1C665A',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventKind" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6C4A8F',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventKind_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventSubmission" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "eventName" TEXT NOT NULL,
    "entityType" "public"."EntityType" NOT NULL DEFAULT 'INDIVIDUAL',
    "entityName" TEXT,
    "description" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "expectedImpact" TEXT,
    "targetAudience" TEXT,
    "proposedVenue" TEXT,
    "proposedDate" TEXT,
    "eventType" TEXT,
    "isSustainable" BOOLEAN NOT NULL DEFAULT false,
    "sustainabilityNote" TEXT,
    "sponsorshipNeeded" TEXT,
    "sponsorshipNote" TEXT,
    "additionalNotes" TEXT,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "directorate" TEXT,
    "culturalCenterId" TEXT,
    "governorate" TEXT,
    "dedupeKey" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "referenceNo" TEXT,

    CONSTRAINT "EventSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalLicenseApplication" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT,
    "accessTokenHash" TEXT NOT NULL,
    "applicantName" TEXT,
    "nationalId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "capacity" TEXT,
    "licenseType" "public"."LegalLicenseType",
    "entityName" TEXT,
    "purpose" TEXT,
    "objectives" TEXT,
    "activityDescription" TEXT,
    "governorate" TEXT,
    "address" TEXT,
    "status" "public"."LegalLicenseStatus" NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "declarationAccuracy" BOOLEAN NOT NULL DEFAULT false,
    "declarationResponsibility" BOOLEAN NOT NULL DEFAULT false,
    "declarationPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "applicantSignature" TEXT,
    "deficiencyNote" TEXT,
    "committeeRecommendation" TEXT,
    "ministerDecision" TEXT,
    "licenseNumber" TEXT,
    "licenseDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligibilityAnswers" JSONB,
    "premisesAnswers" JSONB,
    "bylawAnswers" JSONB,
    "postLicenseDeclarations" JSONB,
    "managerDetails" JSONB,
    "requirementSnapshot" JSONB,
    "deficiencyScopes" JSONB,
    "documentTemplateVersion" TEXT,

    CONSTRAINT "LegalLicenseApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalLicenseAttachment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "founderId" TEXT,
    "kind" "public"."LegalLicenseAttachmentKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateVersion" TEXT,
    "verificationCode" TEXT,
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "LegalLicenseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalLicenseFounder" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fullName" TEXT,
    "nationalId" TEXT,
    "birthDate" TIMESTAMP(3),
    "occupation" TEXT,
    "qualification" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isAuthorizedRepresentative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalLicenseFounder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalLicenseHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "fromStatus" "public"."LegalLicenseStatus",
    "toStatus" "public"."LegalLicenseStatus",
    "action" TEXT NOT NULL,
    "note" TEXT,
    "publicNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalLicenseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalLicenseReviewItem" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicationRevision" INTEGER NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "subjectRef" TEXT,
    "status" "public"."LegalLicenseReviewStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "publicNote" TEXT,
    "reviewerId" TEXT,
    "reviewerEmail" TEXT,
    "reviewerName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalLicenseReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altAr" TEXT,
    "altEn" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "contentAr" TEXT,
    "contentEn" TEXT,
    "summaryAr" TEXT,
    "summaryEn" TEXT,
    "slug" TEXT NOT NULL,
    "status" "public"."PostStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "public"."PostType" NOT NULL DEFAULT 'NEWS',
    "featuredImage" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "seoTitleAr" TEXT,
    "seoTitleEn" TEXT,
    "seoDescAr" TEXT,
    "seoDescEn" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "builderData" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "sourceUrl" TEXT,
    "twitterUrl" TEXT,
    "youtubeUrl" TEXT,
    "gallery" TEXT,
    "attachments" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "public"."ReferenceCounter" (
    "scope" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("scope","year")
);

-- CreateTable
CREATE TABLE "public"."Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "group" TEXT NOT NULL DEFAULT 'general',
    "labelAr" TEXT,
    "labelEn" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'AUTHOR',
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "public"."AuditLog"("actorId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_targetId_idx" ON "public"."AuditLog"("targetId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CopyrightSubmission_internalRefNumber_key" ON "public"."CopyrightSubmission"("internalRefNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CopyrightSubmission_paymentRef_key" ON "public"."CopyrightSubmission"("paymentRef" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CopyrightSubmission_referenceNo_key" ON "public"."CopyrightSubmission"("referenceNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CulturalCenter_nameAr_governorate_key" ON "public"."CulturalCenter"("nameAr" ASC, "governorate" ASC);

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "public"."Event"("createdById" ASC);

-- CreateIndex
CREATE INDEX "Event_reviewStatus_idx" ON "public"."Event"("reviewStatus" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Event_source_externalId_key" ON "public"."Event"("source" ASC, "externalId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_nameAr_key" ON "public"."EventCategory"("nameAr" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EventKind_nameAr_key" ON "public"."EventKind"("nameAr" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EventSubmission_dedupeKey_key" ON "public"."EventSubmission"("dedupeKey" ASC);

-- CreateIndex
CREATE INDEX "EventSubmission_deletedAt_idx" ON "public"."EventSubmission"("deletedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EventSubmission_referenceNo_key" ON "public"."EventSubmission"("referenceNo" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseApplication_accessTokenHash_idx" ON "public"."LegalLicenseApplication"("accessTokenHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LegalLicenseApplication_accessTokenHash_key" ON "public"."LegalLicenseApplication"("accessTokenHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LegalLicenseApplication_licenseNumber_key" ON "public"."LegalLicenseApplication"("licenseNumber" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseApplication_referenceNo_idx" ON "public"."LegalLicenseApplication"("referenceNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LegalLicenseApplication_referenceNo_key" ON "public"."LegalLicenseApplication"("referenceNo" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseApplication_status_idx" ON "public"."LegalLicenseApplication"("status" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseAttachment_applicationId_idx" ON "public"."LegalLicenseAttachment"("applicationId" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseAttachment_founderId_idx" ON "public"."LegalLicenseAttachment"("founderId" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseAttachment_kind_idx" ON "public"."LegalLicenseAttachment"("kind" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LegalLicenseAttachment_storageKey_key" ON "public"."LegalLicenseAttachment"("storageKey" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LegalLicenseAttachment_verificationCode_key" ON "public"."LegalLicenseAttachment"("verificationCode" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseFounder_applicationId_idx" ON "public"."LegalLicenseFounder"("applicationId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LegalLicenseFounder_applicationId_nationalId_key" ON "public"."LegalLicenseFounder"("applicationId" ASC, "nationalId" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseHistory_applicationId_idx" ON "public"."LegalLicenseHistory"("applicationId" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseHistory_createdAt_idx" ON "public"."LegalLicenseHistory"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LLReview_app_revision_requirement_subject_key" ON "public"."LegalLicenseReviewItem"("applicationId" ASC, "applicationRevision" ASC, "requirementKey" ASC, "subjectRef" ASC);

-- CreateIndex
CREATE INDEX "LegalLicenseReviewItem_applicationId_applicationRevision_idx" ON "public"."LegalLicenseReviewItem"("applicationId" ASC, "applicationRevision" ASC);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId" ASC);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "public"."Notification"("userId" ASC, "isRead" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "public"."Post"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "public"."Setting"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "public"."Tag"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "public"."EventCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_eventKindId_fkey" FOREIGN KEY ("eventKindId") REFERENCES "public"."EventKind"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegalLicenseAttachment" ADD CONSTRAINT "LegalLicenseAttachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."LegalLicenseApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegalLicenseAttachment" ADD CONSTRAINT "LegalLicenseAttachment_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "public"."LegalLicenseFounder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegalLicenseFounder" ADD CONSTRAINT "LegalLicenseFounder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."LegalLicenseApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegalLicenseHistory" ADD CONSTRAINT "LegalLicenseHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."LegalLicenseApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegalLicenseReviewItem" ADD CONSTRAINT "LegalLicenseReviewItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "public"."LegalLicenseApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Constructs Prisma's schema diff cannot represent and therefore silently
-- drops from the generated script above (verified by querying pg_constraint
-- / pg_indexes directly against the live dev database — see task notes):
-- a raw CHECK constraint and a partial unique index. Both were originally
-- introduced by hand-written SQL in prisma/migrations_manual/. Restored here
-- so the baseline is a faithful copy of the actual current database shape.

-- AddCheckConstraint (originally: migrations_manual/... business logic hardening)
ALTER TABLE "public"."Event"
  ADD CONSTRAINT "Event_endDate_after_startDate"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- CreatePartialIndex (originally: migrations_manual/2026-07-31_legal_license_guided_documents.sql)
CREATE UNIQUE INDEX "LLReview_app_revision_requirement_null_subject_key"
  ON "public"."LegalLicenseReviewItem" ("applicationId", "applicationRevision", "requirementKey")
  WHERE ("subjectRef" IS NULL);

-- Drop DB-level defaults on updatedAt for LegalLicense* tables: harmless
-- pre-existing drift from how these columns were originally created via
-- db push, but Prisma's own generated migrations never set a DB default
-- here (@updatedAt is maintained by Prisma Client on every write). Dropping
-- it makes the baseline match schema.prisma exactly.
ALTER TABLE "public"."LegalLicenseApplication" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "public"."LegalLicenseAttachment" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "public"."LegalLicenseFounder" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "public"."LegalLicenseReviewItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
