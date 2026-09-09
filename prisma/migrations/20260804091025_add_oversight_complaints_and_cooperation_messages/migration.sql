-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "OversightComplaint" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT,
    "category" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "against" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "incidentDate" TEXT,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OversightComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CooperationMessage" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT,
    "contactType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CooperationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OversightComplaint_referenceNo_key" ON "OversightComplaint"("referenceNo");

-- CreateIndex
CREATE INDEX "OversightComplaint_status_createdAt_idx" ON "OversightComplaint"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CooperationMessage_referenceNo_key" ON "CooperationMessage"("referenceNo");

-- CreateIndex
CREATE INDEX "CooperationMessage_status_createdAt_idx" ON "CooperationMessage"("status", "createdAt");
