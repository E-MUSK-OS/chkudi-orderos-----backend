import prisma from "../config/prisma.js";

// ==================================================================================
// =========================== WAREHOUSE ============================================
// ==================================================================================

export const findWarehouseById = async (id, userId) => {
  return prisma.warehouse.findFirst({
    where: {
      id,
      userId,
      isActive: true,
    },
  });
};

// ==================================================================================
// =========================== PRODUCT INVENTORIES ==================================
// ==================================================================================

export const findInventories = async (
  warehouseId,
  productVariantIds,
  userId,
) => {
  return prisma.productInventory.findMany({
    where: {
      warehouseId,
      userId,
      productVariantId: {
        in: productVariantIds,
      },
    },

    include: {
      productVariant: true,
    },
  });
};

// ==================================================================================
// ====================== FIND INVENTORIES BY WAREHOUSE =============================
// ==================================================================================

export const findInventoriesByWarehouse = async (
  warehouseId,
  productVariantIds,
  userId,
  tx = prisma,
) => {
  return tx.productInventory.findMany({
    where: {
      warehouseId,
      userId,

      productVariantId: {
        in: productVariantIds,
      },
    },
  });
};

// ==================================================================================
// ====================== FIND INVENTORY BY WAREHOUSE & VARIANT =====================
// ==================================================================================

export const findInventoryByWarehouseAndVariant = async (
  warehouseId,
  productVariantId,
  userId,
  tx = prisma,
) => {
  return tx.productInventory.findFirst({
    where: {
      warehouseId,
      productVariantId,
      userId,
    },
  });
};

// ==================================================================================
// =========================== CREATE TRANSFER ======================================
// ==================================================================================

export const createTransfer = async (tx, data) => {
  return tx.stockTransfer.create({
    data,
  });
};

// ==================================================================================
// =========================== CREATE TRANSFER ITEMS ================================
// ==================================================================================

export const createTransferItems = async (tx, items) => {
  return tx.stockTransferItem.createMany({
    data: items,
  });
};

// ==================================================================================
// =========================== UPDATE INVENTORY =====================================
// ==================================================================================

export const updateInventory = async (tx, inventoryId, data) => {
  return tx.productInventory.update({
    where: {
      id: inventoryId,
    },

    data,
  });
};

// ==================================================================================
// =========================== CREATE INVENTORY =====================================
// ==================================================================================

export const createInventory = async (tx, data) => {
  return tx.productInventory.create({
    data,
  });
};

// ==================================================================================
// =========================== GET TRANSFER =========================================
// ==================================================================================

export const findTransferById = async (id, userId) => {
  return prisma.stockTransfer.findFirst({
    where: {
      id,
      userId,
    },

    include: {
      fromWarehouse: true,

      toWarehouse: true,

      items: {
        include: {
          productVariant: true,
        },
      },
    },
  });
};
