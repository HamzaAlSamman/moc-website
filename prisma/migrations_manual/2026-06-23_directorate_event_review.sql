-- Directorate role + cultural-calendar event review workflow (2026-06-23)
-- Fully additive: existing events default to reviewStatus = 'APPROVED', so the
-- public calendar is unaffected. Apply on moc.gov.sy after deploying the code.
--
-- NOTE: "ALTER TYPE ... ADD VALUE" cannot run inside a transaction on some
-- PostgreSQL setups. If you wrap this file in BEGIN/COMMIT, run the ALTER TYPE
-- statement separately first.

-- CreateEnum
CREATE TYPE "EventReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DIRECTORATE';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewStatus" "EventReviewStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "Event_reviewStatus_idx" ON "Event"("reviewStatus");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");
