import prisma from "../config/prisma.js";

// ==================================================================================
// ============================== COMMON INCLUDE ====================================
// ==================================================================================

const skuMappingInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

// ==================================================================================
// ============================== CREATE SKU MAPPING ================================
// ==================================================================================

export const createSkuMapping = async (data, tx = prisma) => {
  return tx.skuMapping.create({
    data,
  });
};

// ==================================================================================
// =========================== GET SKU MAPPING BY ID ================================
// ==================================================================================

export const getSkuMappingById = async (id, tx = prisma) => {
  return tx.skuMapping.findUnique({
    where: {
      id,
    },
    include: skuMappingInclude,
  });
};

// ==================================================================================
// ======================== GET SKU BY SHORT SKU ====================================
// ==================================================================================

export const getSkuMappingByShortSku = async (
  userId,
  shortSku,
  tx = prisma,
) => {
  //   return tx.skuMapping.findUnique({
  //     where: {
  //       userId_shortSku: {
  //         userId,
  //         shortSku,
  //       },
  //     },
  //   });

  return tx.skuMapping.findFirst({
    where: {
      userId,
      shortSku: {
        equals: shortSku,
        mode: "insensitive",
      },
    },
  });
};

// ==================================================================================
// ============================== UPDATE SKU =========================================
// ==================================================================================

export const updateSkuMapping = async (id, data, tx = prisma) => {
  return tx.skuMapping.update({
    where: {
      id,
    },
    data,
  });
};

// ==================================================================================
// ============================== DELETE SKU =========================================
// ==================================================================================

export const deleteSkuMapping = async (id, tx = prisma) => {
  return tx.skuMapping.delete({
    where: {
      id,
    },
  });
};

// ==================================================================================
// ============================== GET SKU MAPPINGS ==================================
// ==================================================================================

export const getSkuMappings = async ({
  userId,
  page = 1,
  limit = 10,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const where = {
    userId,
  };

  // ======================================================
  // Search
  // ======================================================

  if (search) {
    where.OR = [
      {
        shortSku: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        barcodeSku: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        ordercookSku: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // ======================================================
  // Sorting
  // ======================================================

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "shortSku",
    "barcodeSku",
    "ordercookSku",
  ];

  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const finalSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.max(Number(limit) || 10, 1);

  const skip = (currentPage - 1) * currentLimit;

  const [skuMappings, total] = await prisma.$transaction([
    prisma.skuMapping.findMany({
      where,
      skip,
      take: currentLimit,
      orderBy: {
        [finalSortBy]: finalSortOrder,
      },
    }),

    prisma.skuMapping.count({
      where,
    }),
  ]);

  return {
    skuMappings,

    pagination: {
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
    },
  };
};
