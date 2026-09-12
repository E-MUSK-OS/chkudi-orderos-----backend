import {
  countProductVariants,
  createProductVariant,
  getProductVariants,
  getProductVariantById,
  updateProductVariant,
  deleteProductVariant,
  findProductVariantBySku,
  updateProductVariantStatus,
  getProductVariantStats,
  getProductVariantsByProductId,
  updateVariantsStatusByProduct,
} from "../repositories/productVariant.repository.js";

import { getProductById } from "../repositories/product.repository.js";
import { upsertAsinImport } from "../repositories/asinImport.repository.js";
import prisma from "../config/prisma.js";
// import { createInventoryService } from "./inventory.service.js";
// import { getDefaultWarehouse } from "../repositories/warehouse.repository.js";
import { getWarehousesByUserId } from "../repositories/warehouse.repository.js";

// ======================================================
// Create Product Variant
// ======================================================

export const createProductVariantService = async (userId, data) => {
  // Product Exists
  const product = await getProductById(data.productId, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  // Maximum Variant Limit (Optional)
  const totalVariants = await countProductVariants(product.id);

  if (totalVariants >= 1000) {
    throw new Error("Maximum variant limit reached for this product.");
  }

  // Duplicate Variant SKU
  const existingVariant = await findProductVariantBySku(
    data.productId,
    data.variantSku,
  );

  if (existingVariant) {
    throw new Error("Variant SKU already exists.");
  }

  const effectiveBarcode = data.generateBarcode ? data.generateBarcode.trim() : (product.generateBarcode || "No");

  const variant = await prisma.$transaction(async (tx) => {
    const created = await createProductVariant(
      {
        ...data,
        asin: data.asin?.trim() || null,
        rackAddress: data.rackAddress?.trim() || null,
        generateBarcode: effectiveBarcode,
        isActive: data.isActive ?? true,
      },
      tx,
    );

    const warehouses = await getWarehousesByUserId(userId, tx);

    // if (!defaultWarehouse) {
    //   throw new Error("Please create a default warehouse first.");
    // }

    await tx.productInventory.createMany({
      data: warehouses.map((warehouse) => ({
        productVariantId: created.id,
        warehouseId: warehouse.id,
        userId,

        availableStock: 0,
        reservedStock: 0,
        incomingStock: 0,
        damagedStock: 0,

        reorderLevel: 10,
      })),
    });

    // await createInventoryService(created.id, userId, tx);

    return created;
  });

  // Sync to AsinImport table
  const effectiveRackAddress = data.rackAddress !== undefined
    ? (data.rackAddress?.trim() || null)
    : (product.rackAddress ? product.rackAddress.trim() : null);

  if (data.asin && data.asin.trim()) {
    try {
      await upsertAsinImport({
        userId,
        asin: data.asin.trim(),
        sku: data.variantSku ? data.variantSku.trim() : "",
        rackAddress: effectiveRackAddress,
        generateBarcode: effectiveBarcode,
      });
    } catch (asinErr) {
      console.error("Failed to sync variant ASIN to AsinImport:", asinErr);
    }
  }

  return variant;
};

// ======================================================
// Get All Product Variants
// ======================================================

export const getAllProductVariantsService = async (userId) => {
  return await getProductVariants(userId);
};

// ======================================================
// Get Product Variant By Id
// ======================================================

export const getProductVariantByIdService = async (id, userId) => {
  const variant = await getProductVariantById(id, userId);

  if (!variant) {
    throw new Error("Product Variant not found.");
  }

  return variant;
};

// ======================================================
// Update Product Variant
// ======================================================

export const updateProductVariantService = async (id, userId, data) => {
  const variant = await getProductVariantById(id, userId);

  if (!variant) {
    throw new Error("Product Variant not found.");
  }

  // Product Exists
  const product = await getProductById(
    data.productId ?? variant.productId,
    userId,
  );

  if (!product) {
    throw new Error("Product not found.");
  }

  // Duplicate Variant SKU
  if (data.variantSku && data.variantSku !== variant.variantSku) {
    const existing = await findProductVariantBySku(product.id, data.variantSku);

    if (existing && existing.id !== id) {
      throw new Error("Variant SKU already exists.");
    }
  }

  const effectiveBarcode = data.generateBarcode !== undefined
    ? (data.generateBarcode?.trim() || "No")
    : (variant.generateBarcode || product.generateBarcode || "No");

  const updated = await updateProductVariant(id, userId, {
    ...data,
    ...(data.asin !== undefined ? { asin: data.asin?.trim() || null } : {}),
    ...(data.rackAddress !== undefined ? { rackAddress: data.rackAddress?.trim() || null } : {}),
    ...(data.generateBarcode !== undefined ? { generateBarcode: data.generateBarcode?.trim() || "No" } : {}),
  });

  // Sync to AsinImport table on variant update
  const effectiveAsin = (data.asin !== undefined ? data.asin : variant.asin)?.trim();
  const effectiveSku = (data.variantSku !== undefined ? data.variantSku : variant.variantSku)?.trim();
  const effectiveRackAddress = data.rackAddress !== undefined
    ? (data.rackAddress?.trim() || null)
    : (variant.rackAddress?.trim() || product.rackAddress?.trim() || null);

  if (effectiveAsin) {
    try {
      await upsertAsinImport({
        userId,
        asin: effectiveAsin,
        sku: effectiveSku || "",
        rackAddress: effectiveRackAddress,
        generateBarcode: effectiveBarcode,
      });
    } catch (asinErr) {
      console.error("Failed to sync variant ASIN to AsinImport on variant update:", asinErr);
    }
  }

  return updated;
};

// ======================================================
// Delete Product Variant
// ======================================================

export const deleteProductVariantService = async (id, userId) => {
  const variant = await getProductVariantById(id, userId);

  if (!variant) {
    throw new Error("Product Variant not found.");
  }

  await deleteProductVariant(id, userId);

  // Delete matching AsinImport record
  const orConditions = [];
  if (variant.asin && variant.asin.trim()) {
    orConditions.push({ asin: variant.asin.trim() });
  }
  if (variant.variantSku && variant.variantSku.trim()) {
    orConditions.push({ sku: variant.variantSku.trim() });
  }

  if (orConditions.length > 0) {
    try {
      await prisma.asinImport.deleteMany({
        where: {
          userId,
          OR: orConditions,
        },
      });
    } catch (asinErr) {
      console.error("Failed to delete AsinImport record when variant deleted:", asinErr);
    }
  }

  return true;
};

// ======================================================
// Update Product Variant Status
// ======================================================

export const updateProductVariantStatusService = async (
  id,
  userId,
  isActive,
) => {
  const variant = await getProductVariantById(id, userId);

  if (!variant) {
    throw new Error("Product Variant not found.");
  }

  await updateProductVariantStatus(id, userId, isActive);

  return await getProductVariantById(id, userId);
};

// ======================================================
// Product Variant Stats
// ======================================================

export const getProductVariantStatsService = async (userId) => {
  return await getProductVariantStats(userId);
};

export const getProductVariantsByProductIdService = async (
  productId,
  userId,
) => {
  const product = await getProductById(productId, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  return await getProductVariantsByProductId(productId, userId);
};
