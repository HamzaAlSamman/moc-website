-- Display columns for the admin email-audit screen.
--
-- Denormalized on purpose: payloadJson may carry a base64 attachment (a
-- copyright receipt runs a few hundred KB), so the audit list must be able to
-- render "who / what / when" without loading it. Nullable because every row
-- written before this migration has no label to backfill from.
ALTER TABLE "NotificationOutbox" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "NotificationOutbox" ADD COLUMN IF NOT EXISTS "kindAr" TEXT;
ALTER TABLE "NotificationOutbox" ADD COLUMN IF NOT EXISTS "contextAr" TEXT;

-- The audit screen's default view is "newest first, optionally filtered by
-- status"; the existing index is tuned for the worker's claim query instead.
CREATE INDEX IF NOT EXISTS "NotificationOutbox_createdAt_idx"
  ON "NotificationOutbox" ("createdAt" DESC);
