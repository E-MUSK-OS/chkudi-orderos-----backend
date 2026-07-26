import prisma from "../config/prisma.js";

// ======================================================
// Count Products By User
// ======================================================

export const countProductsByUserId = async (userId) => {
  return await prisma.product.count({
    where: {
      userId,
    },
  });
};

// ======================================================
// Create Product
// ======================================================

// ======================================================
// Create Product
// ======================================================

export const createProduct = async (data) => {
  const { attributes = [], ...productData } = data;

  return await prisma.$transaction(async (tx) => {
    // Create Product
    const product = await tx.product.create({
      data: productData,
    });

    // Create Product Attributes
    if (attributes.length > 0) {
      await tx.productAttribute.createMany({
        data: attributes.map((attribute) => ({
          productId: product.id,
          attributeName: attribute.attributeName,
        })),
      });
    }

    // Return Product With Attributes
    return await tx.product.findUnique({
      where: {
        id: product.id,
      },
      include: {
        attributes: true,
      },
    });
  });
};

// ======================================================
// Get All Products
// ======================================================

export const getProductsByUserId = async (userId) => {
  return await prisma.product.findMany({
    where: {
      userId,
    },

    include: {
      attributes: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

// ======================================================
// Get Product By Id
// ======================================================

export const getProductById = async (id, userId) => {
  return await prisma.product.findFirst({
    where: {
      id,
      userId,
    },

    include: {
      attributes: true,
    },
  });
};

// ======================================================
// Find Product By Master SKU
// ======================================================

export const findProductByMasterSku = async (masterSku, userId) => {
  return await prisma.product.findFirst({
    where: {
      masterSku,
      userId,
    },
  });
};

// ======================================================
// Update Product
// ======================================================

export const updateProduct = async (id, data) => {
  const { attributes = [], ...productData } = data;

  return await prisma.$transaction(async (tx) => {
    // ======================================================
    // Update Product
    // ======================================================

    await tx.product.update({
      where: {
        id,
      },
      data: productData,
    });

    // ======================================================
    // Existing Attributes
    // ======================================================

    const existingAttributes = await tx.productAttribute.findMany({
      where: {
        productId: id,
      },
    });

    if (
      existingAttributes.length > 0 &&
      attributes.length > 0 &&
      attributes.every((item) => !item.id)
    ) {
      throw new Error(
        "Invalid attribute payload. Existing attribute ids are missing.",
      );
    }

    // Existing IDs
    const existingIds = existingAttributes.map((item) => item.id);

    // Incoming IDs
    const incomingIds = attributes
      .filter((item) => item.id)
      .map((item) => item.id);

    // ======================================================
    // Update Existing Attributes
    // ======================================================

    for (const attribute of attributes) {
      if (!attribute.id) continue;

      const updated = await tx.productAttribute.updateMany({
        where: {
          id: attribute.id,
          productId: id,
        },
        data: {
          attributeName: attribute.attributeName,
        },
      });

      if (updated.count === 0) {
        throw new Error("Invalid Product Attribute.");
      }
    }

    // ======================================================
    // Create New Attributes
    // ======================================================

    const duplicateNames = new Set();

    for (const attribute of attributes) {
      const key = attribute.attributeName.trim().toLowerCase();

      if (duplicateNames.has(key)) {
        throw new Error(`Duplicate attribute "${attribute.attributeName}".`);
      }

      duplicateNames.add(key);
    }

    const newAttributes = attributes.filter((item) => !item.id);

    if (newAttributes.length > 0) {
      await tx.productAttribute.createMany({
        data: newAttributes.map((attribute) => ({
          productId: id,
          attributeName: attribute.attributeName,
        })),
      });
    }

    // ======================================================
    // Delete Removed Attributes
    // ======================================================

    const deletedIds = existingIds.filter(
      (item) => !incomingIds.includes(item),
    );

    for (const attributeId of deletedIds) {
      const used = await tx.productVariantAttribute.count({
        where: {
          productAttributeId: attributeId,
        },
      });

      if (used > 0) {
        const attribute = existingAttributes.find(
          (item) => item.id === attributeId,
        );

        throw new Error(
          `Attribute "${attribute?.attributeName}" is used in variants and cannot be deleted.`,
        );
      }

      await tx.productAttribute.delete({
        where: {
          id: attributeId,
        },
      });
    }

    // ======================================================
    // Return Updated Product
    // ======================================================

    return await tx.product.findUnique({
      where: {
        id,
      },
      include: {
        attributes: true,
      },
    });
  });
};

// ======================================================
// Delete Product
// ======================================================

export const deleteProduct = async (id, userId) => {
  return await prisma.product.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

// ======================================================
// Update Product Status
// ======================================================

export const updateProductStatus = async (id, isActive) => {
  return await prisma.product.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });
};

// ======================================================
// Get Product Stats
// ======================================================

export const getProductStats = async (userId) => {
  const totalProducts = await prisma.product.count({
    where: {
      userId,
    },
  });

  const activeProducts = await prisma.product.count({
    where: {
      userId,
      isActive: true,
    },
  });

  const inactiveProducts = await prisma.product.count({
    where: {
      userId,
      isActive: false,
    },
  });

  return {
    totalProducts,
    activeProducts,
    inactiveProducts,
  };
};

// ======================================================
// Find Product By Name
// ======================================================

export const findProductByName = async (productName, userId) => {
  return await prisma.product.findFirst({
    where: {
      productName,
      userId,
    },
  });
};
