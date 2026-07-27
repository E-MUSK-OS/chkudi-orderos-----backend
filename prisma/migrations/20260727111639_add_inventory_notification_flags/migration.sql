-- AlterTable
ALTER TABLE "ProductInventory" ADD COLUMN     "lowStock10Notified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lowStock25Notified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "outOfStockNotified" BOOLEAN NOT NULL DEFAULT false;
