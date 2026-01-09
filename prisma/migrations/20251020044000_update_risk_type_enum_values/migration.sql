/*
  Warnings:

  - The values [LOW,MEDIUM,HIGH,VERY_HIGH] on the enum `RiskType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "RiskType_new" AS ENUM ('KONSERVATIV', 'AUSGEWOGEN', 'GEWINNORIENTIERT');

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "riskType" TYPE "RiskType_new" USING ("riskType"::text::"RiskType_new");

-- DropEnum
DROP TYPE "RiskType";

-- AlterEnum
ALTER TYPE "RiskType_new" RENAME TO "RiskType";