-- AlterTable
ALTER TABLE "CopyrightSubmission" ADD COLUMN     "certificateFile" TEXT,
ADD COLUMN     "certificateIssuedAt" TIMESTAMP(3),
ADD COLUMN     "certificateIssuedById" TEXT;
