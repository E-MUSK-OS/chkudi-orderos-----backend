import {
  countMaterialVariants,
  createMaterialVariant,
  getMaterialVariants,
  getMaterialVariantById,
  updateMaterialVariant,
  deleteMaterialVariant,
  findMaterialVariantBySku,
  updateMaterialVariantStatus,
  getMaterialVariantStats,
  getMaterialVariantsByMaterialId,
} from "../repositories/materialVariant.repository.js";

import { getMaterialById } from "../repositories/material.repository.js";
import { upsertAsinImport } from "../repositories/asinImport.repository.js";
import prisma from "../config/prisma.js";

// ======================================================
// Create Material Variant
// ======================================================

export const createMaterialVariantService = async (userId, data) => {
  const material = await getMaterialById(data.materialId, userId);

  if (!material) {
    throw new Error("Material not found.");
  }

  const totalVariants = await countMaterialVariants(material.id);
  if (totalVariants >= 1000) {
    throw new Error("Maximum variant limit reached for this material.");
  }

  const existingVariant = await findMaterialVariantBySku(
    data.materialId,
    data.variantSku,
  );

  if (existingVariant) {
    throw new Error("Variant SKU already exists.");
  }

  const effectiveBarcode = data.generateBarcode
    ? data.generateBarcode.trim()
    : (material.generateBarcode || "No");

  const variant = await prisma.$transaction(
    async (tx) => {
      const created = await createMaterialVariant(
        {
          ...data,
          asin: data.asin?.trim() || null,
          rackAddress: data.rackAddress?.trim() || null,
          generateBarcode: effectiveBarcode,
          isActive: data.isActive ?? true,
        },
        tx,
      );

      return created;
    },
    { maxWait: 10000, timeout: 20000 }
  );

  if (data.asin && data.asin.trim()) {
    try {
      await upsertAsinImport({
        userId,
        asin: data.asin.trim(),
        sku: data.variantSku ? data.variantSku.trim() : "",
        rackAddress: data.rackAddress ? data.rackAddress.trim() : (material.rackAddress || null),
        generateBarcode: effectiveBarcode,
      });
    } catch (asinErr) {
      console.error("Failed to sync ASIN to AsinImport:", asinErr);
    }
  }

  return variant;
};

// ======================================================
// Get All Material Variants
// ======================================================

export const getAllMaterialVariantsService = async (userId) => {
  return await getMaterialVariants(userId);
};

// ======================================================
// Get Material Variant By Id
// ======================================================

export const getMaterialVariantByIdService = async (id, userId) => {
  const variant = await getMaterialVariantById(id, userId);

  if (!variant) {
    throw new Error("Material variant not found.");
  }

  return variant;
};

// ======================================================
// Update Material Variant
// ======================================================

export const updateMaterialVariantService = async (id, userId, data) => {
  const existing = await getMaterialVariantById(id, userId);

  if (!existing) {
    throw new Error("Material variant not found.");
  }

  const effectiveBarcode = data.generateBarcode !== undefined
    ? (data.generateBarcode?.trim() || "No")
    : (existing.generateBarcode || "No");

  const updatedVariant = await updateMaterialVariant(id, userId, {
    ...data,
    asin: data.asin !== undefined ? (data.asin?.trim() || null) : existing.asin,
    rackAddress: data.rackAddress !== undefined ? (data.rackAddress?.trim() || null) : existing.rackAddress,
    generateBarcode: effectiveBarcode,
  });

  return updatedVariant;
};

// ======================================================
// Delete Material Variant
// ======================================================

export const deleteMaterialVariantService = async (id, userId) => {
  const variant = await getMaterialVariantById(id, userId);

  if (!variant) {
    throw new Error("Material variant not found.");
  }

  await deleteMaterialVariant(id, userId);
  return true;
};

// ======================================================
// Update Material Variant Status
// ======================================================

export const updateMaterialVariantStatusService = async (
  id,
  userId,
  isActive,
) => {
  const variant = await getMaterialVariantById(id, userId);

  if (!variant) {
    throw new Error("Material variant not found.");
  }

  await updateMaterialVariantStatus(id, userId, isActive);
  return await getMaterialVariantById(id, userId);
};

// ======================================================
// Material Variant Stats
// ======================================================

export const getMaterialVariantStatsService = async (userId) => {
  return await getMaterialVariantStats(userId);
};

export const getMaterialVariantsByMaterialIdService = async (
  materialId,
  userId,
) => {
  return await getMaterialVariantsByMaterialId(materialId, userId);
};

