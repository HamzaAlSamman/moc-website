-- Additive legal-license workflow schema. Safe to re-run on PostgreSQL.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LICENSING_OFFICER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LICENSING_COMMITTEE';

DO $$ BEGIN
  CREATE TYPE "LegalLicenseType" AS ENUM (
    'CULTURAL_FORUM', 'CULTURAL_HOUSE', 'CULTURAL_ASSOCIATION',
    'AMATEUR_TROUPE', 'CINEMA_ARTS', 'FINE_ARTS', 'HERITAGE_MUSEUM',
    'MUSIC_INSTITUTE', 'THEATER_INSTITUTE', 'FINE_ARTS_GALLERY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LegalLicenseStatus" AS ENUM (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'SUSPENDED',
    'LEGAL_APPROVAL', 'MINISTER_APPROVAL', 'APPROVED', 'REJECTED',
    'LICENSE_ISSUED', 'COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LegalLicenseAttachmentKind" AS ENUM (
    'NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK', 'CRIMINAL_RECORD',
    'RESIDENCE_DOCUMENT', 'PERSONAL_PHOTO', 'AUTHORIZATION',
    'FOUNDERS_MINUTES', 'ACTIVITY_PLAN', 'OWNERSHIP_OR_LEASE', 'FLOOR_PLAN',
    'SAFETY_APPROVAL', 'ARTICLES_OF_ASSOCIATION', 'MEMBERS_LIST',
    'ARTISTIC_PROGRAM', 'PROFESSIONAL_CERTIFICATE', 'EQUIPMENT_LIST',
    'ARTWORK_PORTFOLIO', 'COLLECTION_INVENTORY', 'COLLECTION_PROVENANCE',
    'ACADEMIC_QUALIFICATION', 'PROGRAM_AND_CURRICULUM', 'GALLERY_PROGRAM',
    'APPLICATION_PDF', 'ISSUED_LICENSE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LegalLicenseApplication" (
  "id" TEXT NOT NULL,
  "referenceNo" TEXT,
  "accessTokenHash" TEXT NOT NULL,
  "applicantName" TEXT,
  "nationalId" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "capacity" TEXT,
  "licenseType" "LegalLicenseType",
  "entityName" TEXT,
  "purpose" TEXT,
  "objectives" TEXT,
  "activityDescription" TEXT,
  "governorate" TEXT,
  "address" TEXT,
  "status" "LegalLicenseStatus" NOT NULL DEFAULT 'DRAFT',
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
  CONSTRAINT "LegalLicenseApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LegalLicenseFounder" (
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
  CONSTRAINT "LegalLicenseFounder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalLicenseFounder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LegalLicenseApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LegalLicenseAttachment" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "founderId" TEXT,
  "kind" "LegalLicenseAttachmentKind" NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalLicenseAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalLicenseAttachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LegalLicenseApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LegalLicenseAttachment_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "LegalLicenseFounder"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LegalLicenseHistory" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT,
  "actorEmail" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "fromStatus" "LegalLicenseStatus",
  "toStatus" "LegalLicenseStatus",
  "action" TEXT NOT NULL,
  "note" TEXT,
  "publicNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalLicenseHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegalLicenseHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LegalLicenseApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalLicenseApplication_referenceNo_key" ON "LegalLicenseApplication"("referenceNo");
CREATE UNIQUE INDEX IF NOT EXISTS "LegalLicenseApplication_accessTokenHash_key" ON "LegalLicenseApplication"("accessTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "LegalLicenseApplication_licenseNumber_key" ON "LegalLicenseApplication"("licenseNumber");
CREATE INDEX IF NOT EXISTS "LegalLicenseApplication_status_idx" ON "LegalLicenseApplication"("status");
CREATE INDEX IF NOT EXISTS "LegalLicenseApplication_referenceNo_idx" ON "LegalLicenseApplication"("referenceNo");
CREATE INDEX IF NOT EXISTS "LegalLicenseApplication_accessTokenHash_idx" ON "LegalLicenseApplication"("accessTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "LegalLicenseFounder_applicationId_nationalId_key" ON "LegalLicenseFounder"("applicationId", "nationalId");
CREATE INDEX IF NOT EXISTS "LegalLicenseFounder_applicationId_idx" ON "LegalLicenseFounder"("applicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "LegalLicenseAttachment_storageKey_key" ON "LegalLicenseAttachment"("storageKey");
CREATE INDEX IF NOT EXISTS "LegalLicenseAttachment_applicationId_idx" ON "LegalLicenseAttachment"("applicationId");
CREATE INDEX IF NOT EXISTS "LegalLicenseAttachment_founderId_idx" ON "LegalLicenseAttachment"("founderId");
CREATE INDEX IF NOT EXISTS "LegalLicenseAttachment_kind_idx" ON "LegalLicenseAttachment"("kind");
CREATE INDEX IF NOT EXISTS "LegalLicenseHistory_applicationId_idx" ON "LegalLicenseHistory"("applicationId");
CREATE INDEX IF NOT EXISTS "LegalLicenseHistory_createdAt_idx" ON "LegalLicenseHistory"("createdAt");
