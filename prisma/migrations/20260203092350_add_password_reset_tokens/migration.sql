/*
  Warnings:

  - Added the required column `phone` to the `partners` table without a default value. This is not possible if the table is not empty.
  - Made the column `agentNumber` on table `partners` required. This step will fail if there are existing NULL values in that column.
  - Made the column `birthday` on table `partners` required. This step will fail if there are existing NULL values in that column.
  - Made the column `partnerId` on table `qa_sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `referralCode` on table `qa_sessions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PasswordResetUserType" AS ENUM ('ADMIN', 'PARTNER');

-- AlterEnum
ALTER TYPE "SessionPhase" ADD VALUE 'TERMS_FROOTS';

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "signatureLocation" TEXT NOT NULL DEFAULT 'Wien',
ALTER COLUMN "agentNumber" SET NOT NULL,
ALTER COLUMN "birthday" SET NOT NULL;

-- AlterTable
ALTER TABLE "personal_info" ADD COLUMN     "fullName" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "duration" INTEGER;

-- AlterTable
ALTER TABLE "qa_sessions" ALTER COLUMN "partnerId" SET NOT NULL,
ALTER COLUMN "referralCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "questions" ALTER COLUMN "questionOrder" SET DEFAULT 1,
ALTER COLUMN "questionOrder" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userType" "PasswordResetUserType" NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_userType_idx" ON "password_reset_tokens"("token", "userType");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_userType_idx" ON "password_reset_tokens"("email", "userType");
