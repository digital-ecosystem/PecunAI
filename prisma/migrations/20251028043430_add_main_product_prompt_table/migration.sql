-- CreateTable
CREATE TABLE "public"."main_product_prompts" (
    "id" TEXT NOT NULL,
    "vectorId" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'gpt-5',
    "mcpUrl" TEXT,
    "mainPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_product_prompts_pkey" PRIMARY KEY ("id")
);
