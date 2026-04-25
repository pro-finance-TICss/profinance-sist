/*
  Warnings:

  - You are about to drop the column `date` on the `Performance` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Performance_date_idx";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'SAVINGS';

-- AlterTable
ALTER TABLE "Performance" DROP COLUMN "date",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "percentage" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AccountPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "performanceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "percentageRaw" DECIMAL(65,30) NOT NULL,
    "capitalBase" DECIMAL(65,30) NOT NULL,
    "gainAmount" DECIMAL(65,30) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountPerformanceSnapshot_accountId_idx" ON "AccountPerformanceSnapshot"("accountId");

-- CreateIndex
CREATE INDEX "AccountPerformanceSnapshot_periodStart_idx" ON "AccountPerformanceSnapshot"("periodStart");

-- CreateIndex
CREATE INDEX "AccountPerformanceSnapshot_accountId_periodStart_idx" ON "AccountPerformanceSnapshot"("accountId", "periodStart");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Performance_startDate_idx" ON "Performance"("startDate");

-- CreateIndex
CREATE INDEX "Performance_status_idx" ON "Performance"("status");

-- AddForeignKey
ALTER TABLE "AccountPerformanceSnapshot" ADD CONSTRAINT "AccountPerformanceSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountPerformanceSnapshot" ADD CONSTRAINT "AccountPerformanceSnapshot_performanceId_fkey" FOREIGN KEY ("performanceId") REFERENCES "Performance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
