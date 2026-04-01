-- CreateEnum
CREATE TYPE "public"."RiskType" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "maximumYear" INTEGER,
ADD COLUMN     "minimumYear" INTEGER,
ADD COLUMN     "riskType" "public"."RiskType";
