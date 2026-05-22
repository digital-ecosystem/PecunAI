/*
  Warnings:

  - Made the column `partnerId` on table `agents` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "agents" DROP CONSTRAINT "agents_partnerId_fkey";

-- Assign unlinked agents to the first available partner before enforcing NOT NULL
UPDATE "agents"
SET "partnerId" = (SELECT "id" FROM "partners" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "partnerId" IS NULL;

-- AlterTable
ALTER TABLE "agents" ALTER COLUMN "partnerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
