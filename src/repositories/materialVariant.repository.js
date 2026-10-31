import prisma from "../config/prisma.js";

// ======================================================
// Count Material Variants
// ======================================================

export const countMaterialVariants = async (materialId) => {
  return await prisma.materialVariant.count({
    where: {
      materialId,
    },
  });
};

// ======================================================
// Find Material Variant By SKU
// ======================================================

export const findMaterialVariantBySku = async (materialId, variantSku) => {
  return await prisma.materialVariant.findFirst({
    where: {
      materialId,
      variantSku,
    },
  });
};

// ======================================================
// Create Material Variant
// ======================================================

export const createMaterialVariant = async (data, tx = prisma) => {
  const { attributes = [], ...variantData } = data;

  const variant = await tx.materialVariant.create({
    data: variantData,
  });

  const finalAttributes = [...attributes];
  const incomingAttrIds = new Set(
    attributes.map((a) => a.materialAttributeId).filter(Boolean)
  );

  if (variantData.materialId) {
    const materialAttributes = await tx.materialAttribute.findMany({
      where: { materialId: variantData.materialId },
    });

    const missingAttributes = materialAttributes.filter((pa) => !incomingAttrIds.has(pa.id));
    if (missingAttributes.length > 0) {
      const siblingVas = await tx.materialVariantAttribute.findMany({
        where: {
          materialVariant: { materialId: variantData.materialId },
          materialAttributeId: { in: missingAttributes.map((pa) => pa.id) },
        },
      });
      const siblingMap = new Map();
      for (const sva of siblingVas) {
        if (!siblingMap.has(sva.materialAttributeId) && sva.attributeValue) {
          siblingMap.set(sva.materialAttributeId, sva.attributeValue);
        }
      }
      for (const pa of missingAttributes) {
        const val = siblingMap.get(pa.id);
        if (val) {
          finalAttributes.push({
            materialAttributeId: pa.id,
            attributeValue: val,
          });
        }
      }
    }
  }

  if (finalAttributes.length > 0) {
    await tx.materialVariantAttribute.createMany({
      data: finalAttributes.map((attribute) => ({
        materialVariantId: variant.id,
        materialAttributeId: attribute.materialAttributeId,
        attributeValue: attribute.attributeValue,
      })),
      skipDuplicates: true,
    });
  }

  return await tx.materialVariant.findUnique({
    where: {
      id: variant.id,
    },
    include: {
      material: true,
      attributes: {
        include: {
          materialAttribute: true,
        },
      },
    },
  });
};

// ======================================================
// Get All Material Variants
// ======================================================

export const getMaterialVariants = async (userId) => {
  return await prisma.materialVariant.findMany({
    where: {
      material: {
        userId,
      },
    },
    include: {
      material: true,
      attributes: {
        include: {
          materialAttribute: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ======================================================
// Get Material Variant By Id
// ======================================================

export const getMaterialVariantById = async (id, userId) => {
  return await prisma.materialVariant.findFirst({
    where: {
      id,
      material: {
        userId,
      },
    },
    include: {
      material: true,
      attributes: {
        include: {
          materialAttribute: true,
        },
      },
    },
  });
};

// ======================================================
// Update Material Variant
// ======================================================

export const updateMaterialVariant = async (id, userId, data) => {
  const { attributes = [], ...variantData } = data;

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.materialVariant.findFirst({
      where: {
        id,
        material: {
          userId,
        },
      },
    });

    if (!existing) {
      throw new Error("Material Variant not found.");
    }

    await tx.materialVariant.update({
      where: {
        id,
      },
      data: variantData,
    });

    if (data.attributes !== undefined) {
      await tx.materialVariantAttribute.deleteMany({
        where: {
          materialVariantId: id,
        },
      });

      if (attributes.length > 0) {
        await tx.materialVariantAttribute.createMany({
          data: attributes.map((attribute) => ({
            materialVariantId: id,
            materialAttributeId: attribute.materialAttributeId,
            attributeValue: attribute.attributeValue,
          })),
        });
      }
    }

    return await tx.materialVariant.findUnique({
      where: {
        id,
      },
      include: {
        material: true,
        attributes: {
          include: {
            materialAttribute: true,
          },
        },
      },
    });
  });
};

// ======================================================
// Delete Material Variant
// ======================================================

export const deleteMaterialVariant = async (id, userId) => {
  return await prisma.materialVariant.deleteMany({
    where: {
      id,
      material: {
        userId,
      },
    },
  });
};

// ======================================================
// Update Material Variant Status
// ======================================================

export const updateMaterialVariantStatus = async (id, userId, isActive) => {
  return await prisma.materialVariant.updateMany({
    where: {
      id,
      material: {
        userId,
      },
    },
    data: {
      isActive,
    },
  });
};

// ======================================================
// Material Variant Stats
// ======================================================

export const getMaterialVariantStats = async (userId) => {
  const totalVariants = await prisma.materialVariant.count({
    where: {
      material: {
        userId,
      },
    },
  });

  const activeVariants = await prisma.materialVariant.count({
    where: {
      material: {
        userId,
      },
      isActive: true,
    },
  });

  const inactiveVariants = await prisma.materialVariant.count({
    where: {
      material: {
        userId,
      },
      isActive: false,
    },
  });

  return {
    totalVariants,
    activeVariants,
    inactiveVariants,
  };
};

// ======================================================
// Get Variants By Material
// ======================================================

export const getMaterialVariantsByMaterialId = async (materialId, userId) => {
  return await prisma.materialVariant.findMany({
    where: {
      materialId,
      material: {
        userId,
      },
    },
    include: {
      attributes: {
        include: {
          materialAttribute: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

// ======================================================
// Update All Variants Status By Material
// ======================================================

export const updateVariantsStatusByMaterial = async (materialId, isActive) => {
  return await prisma.materialVariant.updateMany({
    where: {
      materialId,
    },
    data: {
      isActive,
    },
  });
};

