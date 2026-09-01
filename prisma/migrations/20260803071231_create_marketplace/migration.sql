-- CreateTable
CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL,
    "marketplaceName" TEXT NOT NULL,
    "marketplaceCode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marketplace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_marketplaceCode_key" ON "Marketplace"("marketplaceCode");

-- CreateIndex
CREATE INDEX "Marketplace_marketplaceCode_idx" ON "Marketplace"("marketplaceCode");
