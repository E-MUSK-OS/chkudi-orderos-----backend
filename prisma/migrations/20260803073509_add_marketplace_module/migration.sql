-- CreateEnum
CREATE TYPE "MarketplaceConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'FAILED');

-- AlterTable
ALTER TABLE "Marketplace" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MarketplaceAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "sellerName" VARCHAR(150) NOT NULL,
    "sellerCode" VARCHAR(100) NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectionStatus" "MarketplaceConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceAccount_userId_idx" ON "MarketplaceAccount"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceAccount_marketplaceId_idx" ON "MarketplaceAccount"("marketplaceId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceAccount_userId_marketplaceId_sellerCode_key" ON "MarketplaceAccount"("userId", "marketplaceId", "sellerCode");

-- AddForeignKey
ALTER TABLE "MarketplaceAccount" ADD CONSTRAINT "MarketplaceAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAccount" ADD CONSTRAINT "MarketplaceAccount_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
