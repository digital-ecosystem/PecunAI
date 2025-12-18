/*
  Warnings:

  - A unique constraint covering the columns `[qaSessionId,questionId]` on the table `answers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."answers_qaSessionId_questionText_key";

-- AlterTable
ALTER TABLE "public"."personal_info" ADD COLUMN     "birthCountry" TEXT;

-- AlterTable
ALTER TABLE "public"."qa_sessions" ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."partners" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partners_email_key" ON "public"."partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partners_referralCode_key" ON "public"."partners"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "answers_qaSessionId_questionId_key" ON "public"."answers"("qaSessionId", "questionId");

-- AddForeignKey
ALTER TABLE "public"."qa_sessions" ADD CONSTRAINT "qa_sessions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
