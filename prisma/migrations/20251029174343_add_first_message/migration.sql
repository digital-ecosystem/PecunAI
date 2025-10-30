/*
  Warnings:

  - Added the required column `first_message` to the `ai_settings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ai_settings" ADD COLUMN     "first_message" TEXT NOT NULL;
