/*
  Warnings:

  - You are about to drop the column `name` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `partners` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `partners` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `partners` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."admins" DROP COLUMN "name",
ADD COLUMN     "agentNumber" TEXT,
ADD COLUMN     "birthday" DATE,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."partners" DROP COLUMN "name",
ADD COLUMN     "agentNumber" TEXT,
ADD COLUMN     "birthday" DATE,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;
