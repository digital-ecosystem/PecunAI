-- AddColumn: resendWindowStart to OTP table
ALTER TABLE "otps" ADD COLUMN "resendWindowStart" TIMESTAMP(3);

-- Backfill: set resendWindowStart to createdAt for existing records
UPDATE "otps" SET "resendWindowStart" = "createdAt" WHERE "resendWindowStart" IS NULL;

-- Make the column NOT NULL after backfill
ALTER TABLE "otps" ALTER COLUMN "resendWindowStart" SET NOT NULL;
