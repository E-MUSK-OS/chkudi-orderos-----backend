import prisma from "../config/prisma.js";

import {
  findWarehouseById,
  findInventories,
  findInventoriesByWarehouse,
  createTransfer,
  createTransferItems,
  createInventory,
  updateInventory,
} from "../repositories/transfer.repository.js";

import { generateTransferNumber } from "../utils/generateTransferNumber.js";

import { AppError } from "../utils/AppError.js";

// ==================================================================================
// =========================== CREATE TRANSFER ======================================
// ==================================================================================

export const createTransferService = async (userId, payload) => {
  const { fromWarehouseId, toWarehouseId, notes, items } = payload;

  // ------------------------------------------------------------------
  // Validate Warehouses
  // ------------------------------------------------------------------

  const fromWarehouse = await findWarehouseById(fromWarehouseId, userId);

  const toWarehouse = await findWarehouseById(toWarehouseId, userId);

  if (!fromWarehouse) {
    throw new AppError("From warehouse not found.", 404);
  }

  if (!toWarehouse) {
    throw new AppError("To warehouse not found.", 404);
  }

  // ------------------------------------------------------------------
  // Inventory Validation
  // ------------------------------------------------------------------

  const productVariantIds = items.map((item) => item.productVariantId);

  // ======================================================
  // Source Warehouse Inventories
  // ======================================================

  const inventories = await findInventories(
    fromWarehouseId,
    productVariantIds,
    userId,
  );

  const inventoryMap = new Map();

  for (const inventory of inventories) {
    inventoryMap.set(inventory.productVariantId, inventory);
  }

  // ======================================================
  // Destination Warehouse Inventories
  // ======================================================

  const destinationInventories = await findInventoriesByWarehouse(
    toWarehouseId,
    productVariantIds,
    userId,
  );

  const destinationInventoryMap = new Map();

  for (const inventory of destinationInventories) {
    destinationInventoryMap.set(inventory.productVariantId, inventory);
  }

  // ======================================================
  // Validate Source Inventory
  // ======================================================

  for (const item of items) {
    const inventory = inventoryMap.get(item.productVariantId);

    if (!inventory) {
      throw new AppError(
        `Inventory not found for variant '${item.productVariantId}'.`,
        404,
      );
    }

    if (inventory.availableStock < item.quantity) {
      throw new AppError(
        `Insufficient stock for SKU '${inventory.productVariant.variantSku}'. Available: ${inventory.availableStock}, Requested: ${item.quantity}.`,
        400,
      );
    }
  }

  // ------------------------------------------------------------------
  // Prisma Transaction
  // ------------------------------------------------------------------

  const result = await prisma.$transaction(async (tx) => {
    // ======================================================
    // Create Transfer
    // ======================================================

    const transfer = await createTransfer(tx, {
      transferNumber: generateTransferNumber(),

      fromWarehouseId,

      toWarehouseId,

      userId,

      notes,
    });

    // ======================================================
    // Create Transfer Items
    // ======================================================

    await createTransferItems(
      tx,
      items.map((item) => ({
        transferId: transfer.id,

        productVariantId: item.productVariantId,

        quantity: item.quantity,
      })),
    );

    // ======================================================
    // Update Inventories
    // ======================================================

    const inventoryUpdatePromises = items.map(async (item) => {
      const sourceInventory = inventoryMap.get(item.productVariantId);

      await updateInventory(tx, sourceInventory.id, {
        availableStock: sourceInventory.availableStock - item.quantity,
      });

      let destinationInventory = destinationInventoryMap.get(
        item.productVariantId,
      );

      if (!destinationInventory) {
        destinationInventory = await createInventory(tx, {
          warehouseId: toWarehouseId,
          productVariantId: item.productVariantId,
          userId,

          availableStock: 0,
          reservedStock: 0,
          damagedStock: 0,
          incomingStock: 0,

          reorderLevel: sourceInventory.reorderLevel,
        });

        destinationInventoryMap.set(
          item.productVariantId,
          destinationInventory,
        );
      }

      await updateInventory(tx, destinationInventory.id, {
        availableStock: destinationInventory.availableStock + item.quantity,
      });
    });

    await Promise.all(inventoryUpdatePromises);

    return transfer;
  });

  return {
    success: true,
    message: "Stock transferred successfully.",

    data: result,
  };
};
