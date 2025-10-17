/*
  Warnings:

  - A unique constraint covering the columns `[qaSessionId,questionText]` on the table `answers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "answers_qaSessionId_questionText_key" ON "public"."answers"("qaSessionId", "questionText");
