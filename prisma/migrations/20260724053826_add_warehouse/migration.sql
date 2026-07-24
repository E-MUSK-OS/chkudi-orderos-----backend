-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "warehouseName" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactPerson" TEXT,
    "phone" VARCHAR(20),
    "email" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "gstNumber" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Warehouse_userId_idx" ON "Warehouse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_userId_warehouseCode_key" ON "Warehouse"("userId", "warehouseCode");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_userId_warehouseName_key" ON "Warehouse"("userId", "warehouseName");

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
