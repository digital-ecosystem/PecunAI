/*
  Warnings:

  - A unique constraint covering the columns `[qaSessionId]` on the table `signteq_handshake_info` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "signteq_handshake_info_qaSessionId_key" ON "signteq_handshake_info"("qaSessionId");
