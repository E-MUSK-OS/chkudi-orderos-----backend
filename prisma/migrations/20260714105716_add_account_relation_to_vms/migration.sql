-- AlterTable
ALTER TABLE "VMSScan" ADD COLUMN     "accountId" TEXT;

-- CreateIndex
CREATE INDEX "VMSScan_operatorId_idx" ON "VMSScan"("operatorId");

-- CreateIndex
CREATE INDEX "VMSScan_accountId_idx" ON "VMSScan"("accountId");

-- AddForeignKey
ALTER TABLE "VMSScan" ADD CONSTRAINT "VMSScan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
