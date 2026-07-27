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
import prisma from "../config/prisma.js";
import { createInventoryService } from "./inventory.service.js";

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

  return await prisma.$transaction(async (tx) => {
    const variant = await createProductVariant(
      {
        ...data,
        isActive: data.isActive ?? true,
      },
      tx,
    );

    await createInventoryService(variant.id, userId, tx);

    return variant;
  });
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

  return await updateProductVariant(id, userId, data);
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
