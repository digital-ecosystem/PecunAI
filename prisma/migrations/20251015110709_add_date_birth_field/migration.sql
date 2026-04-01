/*
  Warnings:

  - Added the required column `dateOfBirth` to the `personal_info` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."personal_info" ADD COLUMN     "dateOfBirth" DATE NOT NULL;
