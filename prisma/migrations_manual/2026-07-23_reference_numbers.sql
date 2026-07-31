-- Sequential reference numbers for citizen requests (see src/lib/reference-number.js).
-- Additive and idempotent: safe to run on the live server before deploying the
-- new code. Existing rows keep referenceNo = NULL, and Postgres allows any
-- number of NULLs under a unique index, so the constraints cannot fail.

CREATE TABLE IF NOT EXISTS "ReferenceCounter" (
  "scope"     TEXT NOT NULL,
  "year"      INTEGER NOT NULL,
  "seq"       INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("scope", "year")
);

ALTER TABLE "EventSubmission"     ADD COLUMN IF NOT EXISTS "referenceNo" TEXT;
ALTER TABLE "CopyrightSubmission" ADD COLUMN IF NOT EXISTS "referenceNo" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "EventSubmission_referenceNo_key"
  ON "EventSubmission" ("referenceNo");
CREATE UNIQUE INDEX IF NOT EXISTS "CopyrightSubmission_referenceNo_key"
  ON "CopyrightSubmission" ("referenceNo");
