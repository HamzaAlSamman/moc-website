-- DropIndex
DROP INDEX "NotificationOutbox_createdAt_idx";

-- CreateIndex
CREATE INDEX "CopyrightSubmission_assignedCenterId_idx" ON "CopyrightSubmission"("assignedCenterId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_createdAt_idx" ON "NotificationOutbox"("createdAt" DESC);
