import prisma from "../config/prisma.js";

// ==================================================================================
// ============================== COMMON INCLUDE ====================================
// ==================================================================================

// const inventoryInclude = {
//   productVariant: {
//     include: {
//       product: true,
//       attributes: {
//         include: {
//           productAttribute: true,
//         },
//       },
//     },
//   },
// };

const inventoryInclude = {
  warehouse: {
    select: {
      id: true,
      warehouseName: true,
      warehouseCode: true,
    },
  },

  productVariant: {
    include: {
      product: true,
      attributes: {
        include: {
          productAttribute: true,
        },
      },
    },
  },
};

// ==================================================================================
// ============================== CREATE INVENTORY ==================================
// ==================================================================================

export const createInventory = async (data, tx = prisma) => {
  return tx.productInventory.create({
    data,
  });
};

// ==================================================================================
// ============================ GET INVENTORY BY ID =================================
// ==================================================================================

export const getInventoryById = async (id, tx = prisma) => {
  return tx.productInventory.findUnique({
    where: {
      id,
    },
    include: inventoryInclude,
  });
};

// ==================================================================================
// ======================= GET INVENTORY BY VARIANT ID ==============================
// ==================================================================================

// export const getInventoryByVariantId = async (
//   productVariantId,
//   tx = prisma,
// ) => {
//   return tx.productInventory.findUnique({
//     where: {
//       productVariantId,
//     },
//     include: inventoryInclude,
//   });
// };

export const getInventoryByVariantId = async (
  productVariantId,
  warehouseId,
  tx = prisma,
) => {
  return tx.productInventory.findUnique({
    where: {
      productVariantId_warehouseId: {
        productVariantId,
        warehouseId,
      },
    },
    include: inventoryInclude,
  });
};

// ==================================================================================
// ============================== UPDATE INVENTORY ==================================
// ==================================================================================

export const updateInventory = async (id, data, tx = prisma) => {
  return tx.productInventory.update({
    where: {
      id,
    },
    data,
  });
};

// ==================================================================================
// ============================== ADJUST INVENTORY ==================================
// ==================================================================================

export const adjustInventory = async (id, data, tx = prisma) => {
  return tx.productInventory.update({
    where: {
      id,
    },
    data,
  });
};

// ==================================================================================
// ============================== DELETE INVENTORY ==================================
// ==================================================================================

export const deleteInventory = async (id, tx = prisma) => {
  return tx.productInventory.delete({
    where: {
      id,
    },
  });
};

export const getInventories = async ({
  userId,

  warehouseId,

  page = 1,

  limit = 10,

  search = "",

  productId,

  variantStatus,

  sortBy = "createdAt",

  sortOrder = "desc",
}) => {
  // const where = {
  //   userId,
  // };

  const where = {
    userId,
  };

  if (warehouseId) {
    where.warehouseId = warehouseId;
  }

  // ======================================================
  // Search
  // ======================================================

  if (search) {
    where.OR = [
      {
        productVariant: {
          variantSku: {
            contains: search,
            mode: "insensitive",
          },
        },
      },

      {
        productVariant: {
          product: {
            productName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        productVariant: {
          product: {
            masterSku: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  // ======================================================
  // Product Filter
  // ======================================================

  if (productId) {
    where.productVariant = {
      ...(where.productVariant || {}),
      productId,
    };
  }

  // ======================================================
  // Variant Status Filter
  // ======================================================

  if (variantStatus !== undefined) {
    where.productVariant = {
      ...(where.productVariant || {}),
      isActive: variantStatus,
    };
  }

  // ======================================================
  // Sorting
  // ======================================================

  // ======================================================
  // Sorting
  // ======================================================

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "availableStock",
    "reservedStock",
    "incomingStock",
    "damagedStock",
    "reorderLevel",
  ];

  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const finalSortOrder = sortOrder === "asc" ? "asc" : "desc";

  let orderBy = {
    [finalSortBy]: finalSortOrder,
  };

  if (sortBy === "productName") {
    orderBy = {
      productVariant: {
        product: {
          productName: finalSortOrder,
        },
      },
    };
  } else if (sortBy === "variantSku") {
    orderBy = {
      productVariant: {
        variantSku: finalSortOrder,
      },
    };
  }

  // ======================================================
  // Pagination
  // ======================================================

  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.max(Number(limit) || 10, 1);

  const skip = (currentPage - 1) * currentLimit;

  // ======================================================
  // Query
  // ======================================================

  const [inventories, total] = await prisma.$transaction([
    prisma.productInventory.findMany({
      where,

      include: inventoryInclude,

      skip,

      take: currentLimit,

      orderBy,
    }),

    prisma.productInventory.count({
      where,
    }),
  ]);

  // ======================================================
  // Response
  // ======================================================

  return {
    inventories,

    pagination: {
      total,

      page: currentPage,
      limit: currentLimit,

      totalPages: Math.ceil(total / currentLimit),
    },
  };
};
