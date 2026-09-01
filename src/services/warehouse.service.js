import {
  countWarehousesByUserId,
  createWarehouse,
  getWarehousesByUserId,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  findWarehouseByName,
  findWarehouseByCode,
  clearDefaultWarehouse,
  updateWarehouseStatus,
  getWarehouseStats,
} from "../repositories/warehouse.repository.js";
import prisma from "../config/prisma.js";

import { getAllVariantIds } from "../repositories/productVariant.repository.js";

// ======================================================
// Create Warehouse
// ======================================================

export const createWarehouseService = async (userId, data) => {
  // Maximum Warehouse Limit
  const totalWarehouses = await countWarehousesByUserId(userId);

  if (totalWarehouses >= 20) {
    throw new Error(
      "Maximum limit reached. You can create up to 20 warehouses only.",
    );
  }

  // Duplicate Warehouse Name
  const existingWarehouseName = await findWarehouseByName(
    data.warehouseName,
    userId,
  );

  if (existingWarehouseName) {
    throw new Error("Warehouse name already exists.");
  }

  // Duplicate Warehouse Code
  const existingWarehouseCode = await findWarehouseByCode(
    data.warehouseCode,
    userId,
  );

  if (existingWarehouseCode) {
    throw new Error("Warehouse code already exists.");
  }

  // Default Warehouse Logic
  if (data.isDefault) {
    await clearDefaultWarehouse(userId);
  }

  // return await createWarehouse({
  //   ...data,
  //   isDefault: data.isDefault ?? false,
  //   isActive: data.isActive ?? true,
  //   userId,
  // });
  return await prisma.$transaction(async (tx) => {
    const variants = await getAllVariantIds(userId, tx);
    const warehouse = await createWarehouse(
      {
        ...data,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        userId,
      },
      tx,
    );

    if (variants.length > 0) {
      await tx.productInventory.createMany({
        data: variants.map((variant) => ({
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          userId,

          availableStock: 0,
          reservedStock: 0,
          incomingStock: 0,
          damagedStock: 0,

          reorderLevel: 10,
        })),
      });
    }
    return warehouse;
  });
};

// ======================================================
// Get All Warehouses
// ======================================================

export const getAllWarehousesService = async (userId) => {
  return await getWarehousesByUserId(userId);
};

// ======================================================
// Get Warehouse By Id
// ======================================================

export const getWarehouseByIdService = async (id, userId) => {
  const warehouse = await getWarehouseById(id, userId);

  if (!warehouse) {
    throw new Error("Warehouse not found.");
  }

  return warehouse;
};

// ======================================================
// Update Warehouse
// ======================================================

export const updateWarehouseService = async (id, userId, data) => {
  const warehouse = await getWarehouseById(id, userId);

  if (!warehouse) {
    throw new Error("Warehouse not found.");
  }

  // Duplicate Name
  if (data.warehouseName && data.warehouseName !== warehouse.warehouseName) {
    const existing = await findWarehouseByName(data.warehouseName, userId);

    if (existing) {
      throw new Error("Warehouse name already exists.");
    }
  }

  // Duplicate Code
  if (data.warehouseCode && data.warehouseCode !== warehouse.warehouseCode) {
    const existing = await findWarehouseByCode(data.warehouseCode, userId);

    if (existing) {
      throw new Error("Warehouse code already exists.");
    }
  }

  // Default Warehouse
  if (data.isDefault === true) {
    await clearDefaultWarehouse(userId);
  }

  await updateWarehouse(id, data);

  return await getWarehouseById(id, userId);
};

// ======================================================
// Delete Warehouse
// ======================================================

export const deleteWarehouseService = async (id, userId) => {
  const warehouse = await getWarehouseById(id, userId);

  if (!warehouse) {
    throw new Error("Warehouse not found.");
  }

  if (warehouse.isDefault) {
    throw new Error("Default warehouse cannot be deleted.");
  }

  await deleteWarehouse(id, userId);

  return true;
};

// ======================================================
// Update Warehouse Status
// ======================================================

export const updateWarehouseStatusService = async (id, userId, isActive) => {
  const warehouse = await getWarehouseById(id, userId);

  if (!warehouse) {
    throw new Error("Warehouse not found.");
  }

  // Default warehouse deactivate નહીં કરી શકાય
  if (warehouse.isDefault && !isActive) {
    throw new Error("Default warehouse cannot be deactivated.");
  }

  return await updateWarehouseStatus(id, isActive);
};

export const getWarehouseStatsService = async (userId) => {
  return await getWarehouseStats(userId);
};
