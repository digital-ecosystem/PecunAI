-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "audioFileId" TEXT;

-- CreateTable
CREATE TABLE "public"."audio_files" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/webm',
    "duration" DOUBLE PRECISION,
    "size" INTEGER NOT NULL,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "public"."audio_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
