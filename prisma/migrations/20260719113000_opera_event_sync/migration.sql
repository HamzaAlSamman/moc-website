ALTER TABLE "Event"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MOC',
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "bookingUrl" TEXT,
  ADD COLUMN "syncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Event_source_externalId_key"
  ON "Event"("source", "externalId");
