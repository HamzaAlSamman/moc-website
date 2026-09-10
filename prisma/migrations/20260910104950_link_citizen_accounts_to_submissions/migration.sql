-- AlterTable
ALTER TABLE "CopyrightSubmission" ADD COLUMN     "citizenId" TEXT;

-- AlterTable
ALTER TABLE "LegalLicenseApplication" ADD COLUMN     "citizenId" TEXT;

-- CreateIndex
CREATE INDEX "CopyrightSubmission_citizenId_createdAt_idx" ON "CopyrightSubmission"("citizenId", "createdAt");

-- CreateIndex
CREATE INDEX "LegalLicenseApplication_citizenId_createdAt_idx" ON "LegalLicenseApplication"("citizenId", "createdAt");

-- AddForeignKey
ALTER TABLE "LegalLicenseApplication" ADD CONSTRAINT "LegalLicenseApplication_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyrightSubmission" ADD CONSTRAINT "CopyrightSubmission_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
