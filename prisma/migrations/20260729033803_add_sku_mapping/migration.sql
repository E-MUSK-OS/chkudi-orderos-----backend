-- CreateTable
CREATE TABLE "SkuMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shortSku" TEXT NOT NULL,
    "barcodeSku" TEXT NOT NULL,
    "ordercookSku" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkuMapping_userId_idx" ON "SkuMapping"("userId");

-- CreateIndex
CREATE INDEX "SkuMapping_shortSku_idx" ON "SkuMapping"("shortSku");

-- CreateIndex
CREATE UNIQUE INDEX "SkuMapping_userId_shortSku_key" ON "SkuMapping"("userId", "shortSku");

-- AddForeignKey
ALTER TABLE "SkuMapping" ADD CONSTRAINT "SkuMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
