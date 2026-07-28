/*
  Warnings:

  - A unique constraint covering the columns `[productVariantId,warehouseId]` on the table `ProductInventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `warehouseId` to the `ProductInventory` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProductInventory_productVariantId_key";

-- AlterTable
ALTER TABLE "ProductInventory" ADD COLUMN     "warehouseId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_productVariantId_warehouseId_key" ON "ProductInventory"("productVariantId", "warehouseId");

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
