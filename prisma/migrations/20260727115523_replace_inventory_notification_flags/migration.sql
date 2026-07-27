/*
  Warnings:

  - You are about to drop the column `lowStock10Notified` on the `ProductInventory` table. All the data in the column will be lost.
  - You are about to drop the column `lowStock25Notified` on the `ProductInventory` table. All the data in the column will be lost.
  - You are about to drop the column `outOfStockNotified` on the `ProductInventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductInventory" DROP COLUMN "lowStock10Notified",
DROP COLUMN "lowStock25Notified",
DROP COLUMN "outOfStockNotified",
ADD COLUMN     "lastNotificationLevel" INTEGER;
