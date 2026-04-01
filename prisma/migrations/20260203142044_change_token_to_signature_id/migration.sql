/*
  Warnings:

  - You are about to drop the column `token` on the `signteq_handshake_info` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "signteq_handshake_info" DROP COLUMN "token",
ADD COLUMN     "signatureId" TEXT;
