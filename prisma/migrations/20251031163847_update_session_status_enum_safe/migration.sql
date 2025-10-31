-- CreateEnum for new SessionStatus
CREATE TYPE "SessionStatus_new" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- Add temporary column with new enum type
ALTER TABLE "qa_sessions" ADD COLUMN "status_new" "SessionStatus_new";

-- Migrate existing data with proper mapping
UPDATE "qa_sessions" SET "status_new" = 
  CASE 
    WHEN "status" = 'DRAFT' THEN 'DRAFT'::"SessionStatus_new"
    WHEN "status" IN ('TERMS_1_PENDING', 'TERMS_2_PENDING') THEN 'PENDING'::"SessionStatus_new"
    WHEN "status" IN ('TERMS_1_ACCEPTED', 'TERMS_2_ACCEPTED', 'QUESTIONS_1_COMPLETE', 'QUESTIONS_2_COMPLETE', 'PRODUCT_SUGGESTED', 'PRODUCT_CONFIRMED', 'CHAT_ACTIVE', 'PERSONAL_INFO_COMPLETE', 'COMPLETED') THEN 'APPROVED'::"SessionStatus_new"
    WHEN "status" = 'PENDING' THEN 'PENDING'::"SessionStatus_new"
    WHEN "status" = 'ABANDONED' THEN 'REJECTED'::"SessionStatus_new"
    ELSE 'DRAFT'::"SessionStatus_new"  -- fallback for any unmapped values
  END;

-- Drop the old column
ALTER TABLE "qa_sessions" DROP COLUMN "status";

-- Rename the new column to the original name
ALTER TABLE "qa_sessions" RENAME COLUMN "status_new" TO "status";

-- Set default value for the new column
ALTER TABLE "qa_sessions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Drop the old enum type
DROP TYPE "SessionStatus";

-- Rename the new enum type to the original name
ALTER TYPE "SessionStatus_new" RENAME TO "SessionStatus";