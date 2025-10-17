-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('DRAFT', 'TERMS_1_PENDING', 'TERMS_1_ACCEPTED', 'QUESTIONS_1_COMPLETE', 'TERMS_2_PENDING', 'TERMS_2_ACCEPTED', 'QUESTIONS_2_COMPLETE', 'PRODUCT_SUGGESTED', 'PRODUCT_CONFIRMED', 'CHAT_ACTIVE', 'PERSONAL_INFO_COMPLETE', 'PENDING', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "public"."SessionPhase" AS ENUM ('DISCOVERY', 'QUALIFICATION', 'PRODUCT_SELECTION', 'CONSULTATION', 'ONBOARDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('customer', 'assistant');

-- CreateEnum
CREATE TYPE "public"."QuestionPhase" AS ENUM ('DISCOVERY', 'QUALIFICATION');

-- CreateEnum
CREATE TYPE "public"."TermsType" AS ENUM ('INITIAL', 'PRODUCT_SPECIFIC');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."qa_sessions" (
    "id" TEXT NOT NULL,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "phase" "public"."SessionPhase" NOT NULL DEFAULT 'DISCOVERY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "qa_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_workflow_state" (
    "qaSessionId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 8,
    "stepData" JSONB NOT NULL DEFAULT '{}',
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_workflow_state_pkey" PRIMARY KEY ("qaSessionId")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,
    "shortName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "questionOrder" INTEGER DEFAULT 1,
    "questionPhase" "public"."QuestionPhase",

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_options" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."answers" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qaSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionOptions" JSONB,
    "questionText" TEXT,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."terms_and_conditions" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "termsType" "public"."TermsType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_and_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_terms_acceptance" (
    "id" TEXT NOT NULL,
    "qaSessionId" TEXT NOT NULL,
    "termsId" TEXT NOT NULL,
    "termsType" "public"."TermsType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_terms_acceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_product_suggestions" (
    "id" TEXT NOT NULL,
    "qaSessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "fileName" TEXT,
    "suggestionReason" TEXT,
    "confidenceScore" DECIMAL(3,2),
    "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_product_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."threads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qaSessionId" TEXT NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageIndex" INTEGER NOT NULL,
    "threadId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personal_info" (
    "age" INTEGER,
    "actsOnOwnAccount" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentProfession" TEXT NOT NULL,
    "customerClassification" TEXT,
    "education" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "isPep" BOOLEAN NOT NULL DEFAULT false,
    "lastName" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "qaSessionId" TEXT NOT NULL,
    "residenceAbroad" BOOLEAN NOT NULL DEFAULT false,
    "street" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" SERIAL NOT NULL,
    "personalInfoId" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issuedOn" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "filename" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."previous_jobs" (
    "id" SERIAL NOT NULL,
    "personalInfoId" INTEGER NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "companyName" TEXT NOT NULL,
    "document" JSONB,

    CONSTRAINT "previous_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."signed_documents" (
    "id" SERIAL NOT NULL,
    "personalInfoId" INTEGER,
    "qaSessionId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "generationTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_settings" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "vectorId" TEXT,
    "productId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_audit_log" (
    "id" TEXT NOT NULL,
    "qaSessionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "session_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "otps_email_key" ON "public"."otps"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "session_workflow_state_qaSessionId_key" ON "public"."session_workflow_state"("qaSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "answers_qaSessionId_key" ON "public"."answers"("qaSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "session_terms_acceptance_qaSessionId_key" ON "public"."session_terms_acceptance"("qaSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "session_product_suggestions_qaSessionId_key" ON "public"."session_product_suggestions"("qaSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "threads_qaSessionId_key" ON "public"."threads"("qaSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "personal_info_qaSessionId_key" ON "public"."personal_info"("qaSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "signed_documents_qaSessionId_key" ON "public"."signed_documents"("qaSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "session_audit_log_qaSessionId_key" ON "public"."session_audit_log"("qaSessionId");

-- AddForeignKey
ALTER TABLE "public"."otps" ADD CONSTRAINT "otps_email_fkey" FOREIGN KEY ("email") REFERENCES "public"."users"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."qa_sessions" ADD CONSTRAINT "qa_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_workflow_state" ADD CONSTRAINT "session_workflow_state_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_terms_acceptance" ADD CONSTRAINT "session_terms_acceptance_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_terms_acceptance" ADD CONSTRAINT "session_terms_acceptance_termsId_fkey" FOREIGN KEY ("termsId") REFERENCES "public"."terms_and_conditions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_product_suggestions" ADD CONSTRAINT "session_product_suggestions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_product_suggestions" ADD CONSTRAINT "session_product_suggestions_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."threads" ADD CONSTRAINT "threads_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_info" ADD CONSTRAINT "personal_info_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_personalInfoId_fkey" FOREIGN KEY ("personalInfoId") REFERENCES "public"."personal_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."previous_jobs" ADD CONSTRAINT "previous_jobs_personalInfoId_fkey" FOREIGN KEY ("personalInfoId") REFERENCES "public"."personal_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signed_documents" ADD CONSTRAINT "signed_documents_personalInfoId_fkey" FOREIGN KEY ("personalInfoId") REFERENCES "public"."personal_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signed_documents" ADD CONSTRAINT "signed_documents_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_settings" ADD CONSTRAINT "ai_settings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_audit_log" ADD CONSTRAINT "session_audit_log_qaSessionId_fkey" FOREIGN KEY ("qaSessionId") REFERENCES "public"."qa_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_audit_log" ADD CONSTRAINT "session_audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
