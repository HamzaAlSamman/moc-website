-- Copyright: split applicant ID into front/back faces + add document-type flag (2026-06-24)
-- The citizen now chooses between a national ID card (front + back faces) and a
-- passport (single data-page image, stored in idFileFront with idFileBack left NULL).
-- idDocType records which was chosen so reviewers aren't left guessing.
--
-- Server still has the legacy single "idFile" column; this migration adds the new
-- columns, carries existing scans into idFileFront (closest to the old single image),
-- then drops idFile. Apply on moc.gov.sy AFTER deploying the code.

-- AlterTable: document-type flag (national_id = front+back, passport = single page)
ALTER TABLE "CopyrightSubmission" ADD COLUMN "idDocType" TEXT NOT NULL DEFAULT 'national_id';

-- AlterTable: the two ID-face columns
ALTER TABLE "CopyrightSubmission" ADD COLUMN "idFileFront" TEXT;
ALTER TABLE "CopyrightSubmission" ADD COLUMN "idFileBack" TEXT;

-- Carry existing single ID images into the front face (closest to the old meaning)
UPDATE "CopyrightSubmission" SET "idFileFront" = "idFile" WHERE "idFile" IS NOT NULL;

-- Drop the legacy single-image column
ALTER TABLE "CopyrightSubmission" DROP COLUMN "idFile";
