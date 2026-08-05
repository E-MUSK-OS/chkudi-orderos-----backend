import prisma from "../config/prisma.js";

// ==================================================================================
// ============================== CREATE MARKETPLACE ================================
// ==================================================================================

export const createMarketplace = async (data, tx = prisma) => {
  return tx.marketplace.create({
    data,
  });
};

// ==================================================================================
// =========================== GET MARKETPLACE BY ID ================================
// ==================================================================================

export const getMarketplaceById = async (id, tx = prisma) => {
  return tx.marketplace.findUnique({
    where: {
      id,
    },
  });
};

// ==================================================================================
// ======================== GET MARKETPLACE BY CODE ================================
// ==================================================================================

export const getMarketplaceByCode = async (marketplaceCode, tx = prisma) => {
  return tx.marketplace.findUnique({
    where: {
      marketplaceCode,
    },
  });
};

// ==================================================================================
// ============================ GET ALL MARKETPLACES ================================
// ==================================================================================

export const getMarketplaces = async ({
  page = 1,
  limit = 10,
  search = "",
  isActive,
  sortBy = "displayOrder",
  sortOrder = "asc",
}) => {

  const where = {};

  // ======================================================
  // Search
  // ======================================================

  if (search) {
    where.OR = [
      {
        marketplaceName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        marketplaceCode: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // ======================================================
  // Active Filter
  // ======================================================

  if (isActive !== undefined) {
    where.isActive = isActive;
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

  const [marketplaces, total] = await prisma.$transaction([
    prisma.marketplace.findMany({
      where,
      skip,
      take: currentLimit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),

    prisma.marketplace.count({
      where,
    }),
  ]);

  return {
    marketplaces,

    pagination: {
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
    },
  };
};

// ==================================================================================
// ============================ UPDATE MARKETPLACE ==================================
// ==================================================================================

export const updateMarketplace = async (id, data, tx = prisma) => {
  return tx.marketplace.update({
    where: {
      id,
    },
    data,
  });
};

// ==================================================================================
// ============================ DELETE MARKETPLACE ==================================
// ==================================================================================

export const deleteMarketplace = async (id, tx = prisma) => {
  return tx.marketplace.delete({
    where: {
      id,
    },
  });
};

// ==================================================================================
// ======================== GET MARKETPLACE BY NAME =================================
// ==================================================================================

export const getMarketplaceByName = async (
  marketplaceName,
  tx = prisma
) => {
  return tx.marketplace.findFirst({
    where: {
      marketplaceName: {
        equals: marketplaceName,
        mode: "insensitive",
      },
    },
  });
};