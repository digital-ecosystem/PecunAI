-- AlterTable
ALTER TABLE "public"."personal_info" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isSelfEmployed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."high_risk_countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "high_risk_countries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "high_risk_countries_name_key" ON "public"."high_risk_countries"("name");
