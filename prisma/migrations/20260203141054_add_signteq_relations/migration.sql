-- CreateTable
CREATE TABLE "signteq_handshake_info" (
    "id" SERIAL NOT NULL,
    "token" TEXT,
    "sessionToken" TEXT,
    "metaDate" JSONB,
    "userId" TEXT,
    "qaSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signteq_handshake_info_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "signteq_handshake_info" ADD CONSTRAINT "signteq_handshake_info_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signteq_handshake_info" ADD CONSTRAINT "signteq_handshake_info_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
