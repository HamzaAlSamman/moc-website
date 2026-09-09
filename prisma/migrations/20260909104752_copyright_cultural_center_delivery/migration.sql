-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CULTURAL_CENTER_OFFICER';

-- DropIndex
DROP INDEX "NotificationOutbox_createdAt_idx";

-- AlterTable
ALTER TABLE "CopyrightSubmission" ADD COLUMN     "assignedCenterId" TEXT,
ADD COLUMN     "centerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "centerConfirmedById" TEXT,
ADD COLUMN     "centerDeliveryMethod" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assignedCenterId" TEXT;

-- CreateIndex
CREATE INDEX "NotificationOutbox_createdAt_idx" ON "NotificationOutbox"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assignedCenterId_fkey" FOREIGN KEY ("assignedCenterId") REFERENCES "CulturalCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyrightSubmission" ADD CONSTRAINT "CopyrightSubmission_assignedCenterId_fkey" FOREIGN KEY ("assignedCenterId") REFERENCES "CulturalCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
