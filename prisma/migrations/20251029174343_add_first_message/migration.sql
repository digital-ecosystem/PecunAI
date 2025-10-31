/*
  Warnings:

  - Added the required column `firstMessage` to the `ai_settings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ai_settings" ADD COLUMN     "firstMessage" TEXT NOT NULL;
