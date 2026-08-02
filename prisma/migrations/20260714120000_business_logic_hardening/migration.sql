ALTER TABLE "EventSubmission"
  ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "CopyrightSubmission"
  ADD COLUMN IF NOT EXISTS "workDriveUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "workOrigin" TEXT,
  ADD COLUMN IF NOT EXISTS "originalWorkName" TEXT,
  ADD COLUMN IF NOT EXISTS "originalPermission" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "EventSubmission_dedupeKey_key"
  ON "EventSubmission"("dedupeKey");
CREATE UNIQUE INDEX IF NOT EXISTS "CopyrightSubmission_paymentRef_key"
  ON "CopyrightSubmission"("paymentRef");
CREATE UNIQUE INDEX IF NOT EXISTS "CopyrightSubmission_internalRefNumber_key"
  ON "CopyrightSubmission"("internalRefNumber");
CREATE INDEX IF NOT EXISTS "EventSubmission_deletedAt_idx"
  ON "EventSubmission"("deletedAt");

ALTER TABLE "Event"
  DROP CONSTRAINT IF EXISTS "Event_endDate_after_startDate";
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_endDate_after_startDate"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
