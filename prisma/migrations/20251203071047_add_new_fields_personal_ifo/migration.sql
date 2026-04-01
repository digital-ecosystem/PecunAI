-- AlterTable
ALTER TABLE "public"."personal_info" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bic" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "isTaxResidentAT" BOOLEAN,
ADD COLUMN     "isTaxResidentOther" BOOLEAN,
ADD COLUMN     "taxResidencyCountry" TEXT;
