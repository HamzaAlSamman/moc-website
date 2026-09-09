-- English proofreading sign-off on cultural-calendar events.
--
-- Nullable with no default: every existing event starts unreviewed, which is
-- the honest state — none of them has been through the new check yet.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "languageReviewedAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "languageReviewedById" TEXT;

-- The reviewer's queue is "upcoming events not yet signed off", so the index
-- covers the sign-off column alongside the date it is ordered by.
CREATE INDEX IF NOT EXISTS "Event_languageReviewedAt_startDate_idx"
  ON "Event" ("languageReviewedAt", "startDate");
