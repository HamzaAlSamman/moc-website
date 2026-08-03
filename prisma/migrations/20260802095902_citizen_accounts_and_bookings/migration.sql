-- CreateEnum
CREATE TYPE "EventBookingAvailability" AS ENUM ('DISABLED', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CitizenIdentityStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CitizenEmailOtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'EMAIL_CHANGE');

-- CreateEnum
CREATE TYPE "CitizenTokenPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_CHANGE_CONFIRMATION');

-- CreateEnum
CREATE TYPE "EventBookingStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventAttendanceStatus" AS ENUM ('NOT_CHECKED_IN', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "EventBookingSource" AS ENUM ('CITIZEN', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bookedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bookingAvailability" "EventBookingAvailability" NOT NULL DEFAULT 'DISABLED',
ADD COLUMN     "bookingClosesAt" TIMESTAMP(3),
ADD COLUMN     "bookingNoteAr" TEXT,
ADD COLUMN     "bookingNoteEn" TEXT,
ADD COLUMN     "bookingOpensAt" TIMESTAMP(3),
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Citizen" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "nationalIdHash" TEXT NOT NULL,
    "nationalIdLast4" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "identityStatus" "CitizenIdentityStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "identitySubmittedAt" TIMESTAMP(3),
    "identityVerifiedAt" TIMESTAMP(3),
    "identityVerifiedById" TEXT,
    "identityRejectedAt" TIMESTAMP(3),
    "identityRejectedReason" TEXT,
    "identityFrontFileKey" TEXT,
    "identityBackFileKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citizen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenEmailOtp" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "purpose" "CitizenEmailOtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenEmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenToken" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "purpose" "CitizenTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "newEmail" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventBooking" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "citizenId" TEXT,
    "fullName" TEXT NOT NULL,
    "nationalIdHash" TEXT NOT NULL,
    "nationalIdLast4" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "EventBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "attendanceStatus" "EventAttendanceStatus" NOT NULL DEFAULT 'NOT_CHECKED_IN',
    "source" "EventBookingSource" NOT NULL DEFAULT 'CITIZEN',
    "ticketSig" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "promotedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "lastError" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_email_key" ON "Citizen"("email");

-- CreateIndex
CREATE INDEX "Citizen_emailVerifiedAt_idx" ON "Citizen"("emailVerifiedAt");

-- CreateIndex
CREATE INDEX "Citizen_identityStatus_idx" ON "Citizen"("identityStatus");

-- CreateIndex
CREATE INDEX "Citizen_isBlocked_isActive_idx" ON "Citizen"("isBlocked", "isActive");

-- CreateIndex
CREATE INDEX "Citizen_nationalIdHash_idx" ON "Citizen"("nationalIdHash");

-- CreateIndex
CREATE INDEX "CitizenEmailOtp_citizenId_purpose_createdAt_id_idx" ON "CitizenEmailOtp"("citizenId", "purpose", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CitizenEmailOtp_expiresAt_consumedAt_revokedAt_idx" ON "CitizenEmailOtp"("expiresAt", "consumedAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenToken_tokenHash_key" ON "CitizenToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CitizenToken_citizenId_purpose_createdAt_idx" ON "CitizenToken"("citizenId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "CitizenToken_expiresAt_idx" ON "CitizenToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventBooking_referenceNo_key" ON "EventBooking"("referenceNo");

-- CreateIndex
CREATE INDEX "EventBooking_eventId_status_createdAt_id_idx" ON "EventBooking"("eventId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EventBooking_eventId_attendanceStatus_idx" ON "EventBooking"("eventId", "attendanceStatus");

-- CreateIndex
CREATE INDEX "EventBooking_citizenId_createdAt_idx" ON "EventBooking"("citizenId", "createdAt");

-- CreateIndex
CREATE INDEX "EventBooking_nationalIdHash_idx" ON "EventBooking"("nationalIdHash");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_availableAt_createdAt_idx" ON "NotificationOutbox"("status", "availableAt", "createdAt");

-- AddForeignKey
ALTER TABLE "CitizenEmailOtp" ADD CONSTRAINT "CitizenEmailOtp_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenToken" ADD CONSTRAINT "CitizenToken_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBooking" ADD CONSTRAINT "EventBooking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBooking" ADD CONSTRAINT "EventBooking_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- Constructs Prisma cannot express in schema.prisma (partial indexes,
-- multi-column CHECK constraints spanning independent columns). See the
-- comments on the Citizen and EventBooking models in schema.prisma, and
-- plan sections 7.2.1, 8.1, 13.3, 13.4.
-- ─────────────────────────────────────────────────────────────────────────

-- One active booking (CONFIRMED or WAITLISTED) per person per event. This,
-- not application-level checking, is the actual guarantee that a citizen
-- cannot hold two seats at the same event — see src/lib/event-booking-server.js.
CREATE UNIQUE INDEX "EventBooking_active_person_unique"
  ON "EventBooking" ("eventId", "nationalIdHash")
  WHERE "status" IN ('CONFIRMED', 'WAITLISTED');

-- One *verified* account per national ID. Deliberately excludes unverified
-- accounts (emailVerifiedAt IS NULL) so a mistyped email or a failed SMTP
-- send at registration can never permanently squat someone's national ID
-- with an unreachable account — see the comment on Citizen.nationalIdHash
-- in schema.prisma and plan section 7.2.1.
CREATE UNIQUE INDEX "Citizen_verified_national_id_unique"
  ON "Citizen" ("nationalIdHash")
  WHERE "emailVerifiedAt" IS NOT NULL;

-- Email is compared case-insensitively everywhere in the app
-- (src/lib/citizen-identity.mjs normalizeEmail); this index makes that the
-- database's guarantee too, not just an application convention.
CREATE UNIQUE INDEX "Citizen_email_lower_unique"
  ON "Citizen" (LOWER("email"));

ALTER TABLE "Event"
  ADD CONSTRAINT "Event_bookedCount_nonnegative"
    CHECK ("bookedCount" >= 0),
  ADD CONSTRAINT "Event_capacity_positive"
    CHECK ("capacity" IS NULL OR "capacity" > 0),
  ADD CONSTRAINT "Event_open_requires_capacity"
    CHECK ("bookingAvailability" <> 'OPEN' OR "capacity" IS NOT NULL),
  ADD CONSTRAINT "Event_bookedCount_within_capacity"
    CHECK ("capacity" IS NULL OR "bookedCount" <= "capacity"),
  ADD CONSTRAINT "Event_booking_window_valid"
    CHECK (
      "bookingOpensAt" IS NULL
      OR "bookingClosesAt" IS NULL
      OR "bookingOpensAt" < "bookingClosesAt"
    );
