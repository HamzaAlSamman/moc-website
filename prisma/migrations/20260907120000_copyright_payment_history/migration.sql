CREATE TABLE "CopyrightPayment" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "gateway" TEXT NOT NULL,
  "receipt" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CopyrightPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CopyrightPayment_reference_key" ON "CopyrightPayment"("reference");
CREATE UNIQUE INDEX "CopyrightPayment_submissionId_stage_key" ON "CopyrightPayment"("submissionId", "stage");
ALTER TABLE "CopyrightPayment" ADD CONSTRAINT "CopyrightPayment_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "CopyrightSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only backfill the transfer still present in the old row. Older overwritten
-- initial transfers cannot be reconstructed and must not be fabricated.
INSERT INTO "CopyrightPayment" ("id", "submissionId", "stage", "reference", "gateway", "receipt", "verifiedAt", "createdAt")
SELECT 'legacy-' || "id", "id",
  CASE WHEN "paymentStatus" IN ('final_paid', 'fully_paid') THEN 'final' ELSE 'initial' END,
  "paymentRef", COALESCE("paymentGateway", 'cham_cash'), "paymentReceipt",
  CASE WHEN "paymentStatus" = 'fully_paid'
    OR ("paymentStatus" = 'initial_paid' AND "applicationStatus" NOT IN ('submitted', 'finance_review'))
    THEN "updatedAt" ELSE NULL END,
  "updatedAt"
FROM "CopyrightSubmission"
WHERE "paymentRef" IS NOT NULL AND "paymentRef" <> ''
  AND "paymentStatus" IN ('initial_paid', 'final_paid', 'fully_paid');
