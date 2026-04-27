-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "partnerId" TEXT;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
