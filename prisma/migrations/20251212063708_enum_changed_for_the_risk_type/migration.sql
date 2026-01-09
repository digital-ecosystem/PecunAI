/*
  Warnings:

  - The values [KONSERVATIV,AUSGEWOGEN,GEWINNORIENTIERT] on the enum `RiskType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."RiskType_new" AS ENUM ('KONSERVATIV', 'AUSGEWOGEN', 'GEWINNORIENTIERT');
ALTER TABLE "public"."products" ALTER COLUMN "riskType" TYPE "public"."RiskType_new" USING ("riskType"::text::"public"."RiskType_new");
ALTER TYPE "public"."RiskType" RENAME TO "RiskType_old";
ALTER TYPE "public"."RiskType_new" RENAME TO "RiskType";
DROP TYPE "public"."RiskType_old";
COMMIT;
