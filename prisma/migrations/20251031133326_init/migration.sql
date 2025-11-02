/*
  Warnings:

  - The values [DISCOVERY,QUALIFICATION] on the enum `QuestionPhase` will be removed. If these variants are still used in the database, this will fail.
  - The values [DISCOVERY,QUALIFICATION,PRODUCT_SELECTION,CONSULTATION,ONBOARDING,COMPLETED] on the enum `SessionPhase` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."QuestionPhase_new" AS ENUM ('QUESTIONS1', 'QUESTIONS2');
ALTER TABLE "public"."questions" ALTER COLUMN "questionPhase" TYPE "public"."QuestionPhase_new" USING ("questionPhase"::text::"public"."QuestionPhase_new");
ALTER TYPE "public"."QuestionPhase" RENAME TO "QuestionPhase_old";
ALTER TYPE "public"."QuestionPhase_new" RENAME TO "QuestionPhase";
DROP TYPE "public"."QuestionPhase_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."SessionPhase_new" AS ENUM ('TERMS1', 'QUESTIONS1', 'TERMS2', 'QUESTIONS2', 'SUGGESTIONS', 'CHAT', 'PERSONAL_INFO', 'SIGN_DOCUMENT', 'RESULT_PDF');
ALTER TABLE "public"."qa_sessions" ALTER COLUMN "phase" DROP DEFAULT;
ALTER TABLE "public"."qa_sessions" ALTER COLUMN "phase" TYPE "public"."SessionPhase_new" USING ("phase"::text::"public"."SessionPhase_new");
ALTER TYPE "public"."SessionPhase" RENAME TO "SessionPhase_old";
ALTER TYPE "public"."SessionPhase_new" RENAME TO "SessionPhase";
DROP TYPE "public"."SessionPhase_old";
ALTER TABLE "public"."qa_sessions" ALTER COLUMN "phase" SET DEFAULT 'TERMS1';
COMMIT;

-- AlterTable
ALTER TABLE "public"."ai_settings" ALTER COLUMN "firstMessage" SET DEFAULT '';

-- AlterTable
ALTER TABLE "public"."answers" ADD COLUMN     "questionType" TEXT;

-- AlterTable
ALTER TABLE "public"."personal_info" ADD COLUMN     "countryCode" TEXT DEFAULT '+43';

-- AlterTable
ALTER TABLE "public"."qa_sessions" ALTER COLUMN "phase" SET DEFAULT 'TERMS1';

-- AlterTable
ALTER TABLE "public"."questions" ADD COLUMN     "questionType" TEXT DEFAULT 'choice';
