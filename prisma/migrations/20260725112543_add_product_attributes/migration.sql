/*
  Warnings:

  - You are about to drop the column `attributeName` on the `ProductVariantAttribute` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,productName]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productVariantId,productAttributeId]` on the table `ProductVariantAttribute` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productAttributeId` to the `ProductVariantAttribute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductVariantAttribute" DROP COLUMN "attributeName",
ADD COLUMN     "productAttributeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "attributeName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_idx" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_attributeName_key" ON "ProductAttribute"("productId", "attributeName");

-- CreateIndex
CREATE UNIQUE INDEX "Product_userId_productName_key" ON "Product"("userId", "productName");

-- CreateIndex
CREATE INDEX "ProductVariantAttribute_productAttributeId_idx" ON "ProductVariantAttribute"("productAttributeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariantAttribute_productVariantId_productAttributeId_key" ON "ProductVariantAttribute"("productVariantId", "productAttributeId");

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariantAttribute" ADD CONSTRAINT "ProductVariantAttribute_productAttributeId_fkey" FOREIGN KEY ("productAttributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
