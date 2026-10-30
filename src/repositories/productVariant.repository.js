import prisma from "../config/prisma.js";

// ======================================================
// Count Product Variants
// ======================================================

export const countProductVariants = async (productId) => {
  return await prisma.productVariant.count({
    where: {
      productId,
    },
  });
};

// ======================================================
// Find Product Variant By SKU
// ======================================================

export const findProductVariantBySku = async (productId, variantSku) => {
  return await prisma.productVariant.findFirst({
    where: {
      productId,
      variantSku,
    },
  });
};

// ======================================================
// Create Product Variant
// ======================================================

// export const createProductVariant = async (data, tx = prisma) => {
//   const { attributes = [], ...variantData } = data;

//   return await prisma.$transaction(async (tx) => {
//     const variant = await tx.productVariant.create({
//       data: variantData,
//     });

//     if (attributes.length > 0) {
//       await tx.productVariantAttribute.createMany({
//         data: attributes.map((attribute) => ({
//           productVariantId: variant.id,
//           productAttributeId: attribute.productAttributeId,
//           attributeValue: attribute.attributeValue,
//         })),
//       });
//     }

//     return await tx.productVariant.findUnique({
//       where: {
//         id: variant.id,
//       },
//       include: {
//         product: true,
//         attributes: {
//           include: {
//             productAttribute: true,
//           },
//         },
//       },
//     });
//   });
// };

export const createProductVariant = async (data, tx = prisma) => {
  const { attributes = [], ...variantData } = data;

  const variant = await tx.productVariant.create({
    data: variantData,
  });

  const finalAttributes = [...attributes];
  const incomingAttrIds = new Set(
    attributes.map((a) => a.productAttributeId).filter(Boolean)
  );

  // Auto-inherit missing attributes (like Gender or other product attributes) from sibling variants
  if (variantData.productId) {
    const productAttributes = await tx.productAttribute.findMany({
      where: { productId: variantData.productId },
    });

    const missingAttributes = productAttributes.filter((pa) => !incomingAttrIds.has(pa.id));
    if (missingAttributes.length > 0) {
      const siblingVas = await tx.productVariantAttribute.findMany({
        where: {
          productVariant: { productId: variantData.productId },
          productAttributeId: { in: missingAttributes.map((pa) => pa.id) },
        },
      });
      const siblingMap = new Map();
      for (const sva of siblingVas) {
        if (!siblingMap.has(sva.productAttributeId) && sva.attributeValue) {
          siblingMap.set(sva.productAttributeId, sva.attributeValue);
        }
      }
      for (const pa of missingAttributes) {
        const val = siblingMap.get(pa.id);
        if (val) {
          finalAttributes.push({
            productAttributeId: pa.id,
            attributeValue: val,
          });
          incomingAttrIds.add(pa.id);
        }
      }
    }
  }

  if (finalAttributes.length > 0) {
    await tx.productVariantAttribute.createMany({
      data: finalAttributes.map((attribute) => ({
        productVariantId: variant.id,
        productAttributeId: attribute.productAttributeId,
        attributeValue: attribute.attributeValue,
      })),
    });
  }

  return await tx.productVariant.findUnique({
    where: {
      id: variant.id,
    },
    include: {
      product: true,
      attributes: {
        include: {
          productAttribute: true,
        },
      },
    },
  });
};

// ======================================================
// Get All Product Variants
// ======================================================

export const getProductVariants = async (userId) => {
  return await prisma.productVariant.findMany({
    where: {
      product: {
        userId,
      },
    },
    include: {
      product: true,
      attributes: {
        include: {
          productAttribute: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ======================================================
// Get Product Variant By Id
// ======================================================

export const getProductVariantById = async (id, userId) => {
  return await prisma.productVariant.findFirst({
    where: {
      id,
      product: {
        userId,
      },
    },
    include: {
      product: true,
      attributes: {
        include: {
          productAttribute: true,
        },
      },
    },
  });
};

// ======================================================
// Update Product Variant
// ======================================================

export const updateProductVariant = async (id, userId, data) => {
  const { attributes = [], ...variantData } = data;

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.productVariant.findFirst({
      where: {
        id,
        product: {
          userId,
        },
      },
    });

    if (!existing) {
      throw new Error("Product Variant not found.");
    }

    await tx.productVariant.update({
      where: {
        id,
      },
      data: variantData,
    });

    if (data.attributes !== undefined) {
      await tx.productVariantAttribute.deleteMany({
        where: {
          productVariantId: id,
        },
      });

      if (attributes.length > 0) {
        await tx.productVariantAttribute.createMany({
          data: attributes.map((attribute) => ({
            productVariantId: id,
            productAttributeId: attribute.productAttributeId,
            attributeValue: attribute.attributeValue,
          })),
        });
      }
    }

    return await tx.productVariant.findUnique({
      where: {
        id,
      },
      include: {
        product: true,
        attributes: {
          include: {
            productAttribute: true,
          },
        },
      },
    });
  });
};

// ======================================================
// Delete Product Variant
// ======================================================

export const deleteProductVariant = async (id, userId) => {
  return await prisma.productVariant.deleteMany({
    where: {
      id,
      product: {
        userId,
      },
    },
  });
};

// ======================================================
// Update Product Variant Status
// ======================================================

export const updateProductVariantStatus = async (id, userId, isActive) => {
  return await prisma.productVariant.updateMany({
    where: {
      id,
      product: {
        userId,
      },
    },
    data: {
      isActive,
    },
  });
};

// ======================================================
// Product Variant Stats
// ======================================================

export const getProductVariantStats = async (userId) => {
  const totalVariants = await prisma.productVariant.count({
    where: {
      product: {
        userId,
      },
    },
  });

  const activeVariants = await prisma.productVariant.count({
    where: {
      product: {
        userId,
      },
      isActive: true,
    },
  });

  const inactiveVariants = await prisma.productVariant.count({
    where: {
      product: {
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
// Get Variants By Product
// ======================================================

export const getProductVariantsByProductId = async (productId, userId) => {
  return await prisma.productVariant.findMany({
    where: {
      productId,
      product: {
        userId,
      },
    },

    include: {
      attributes: {
        include: {
          productAttribute: true,
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });
};

// ======================================================
// Update All Variants Status By Product
// ======================================================

export const updateVariantsStatusByProduct = async (productId, isActive) => {
  console.log("UPDATE VARIANTS", productId, isActive);
  const result = await prisma.productVariant.updateMany({
    where: {
      productId,
    },
    data: {
      isActive,
    },
  });

  console.log(result);

  return result;
};

export const getAllVariantIds = async (userId, tx = prisma) => {
  return await tx.productVariant.findMany({
    where: {
      product: {
        userId,
      },
    },
    select: {
      id: true,
    },
  });
};
