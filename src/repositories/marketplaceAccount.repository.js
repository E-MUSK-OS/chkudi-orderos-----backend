import prisma from "../config/prisma.js";

// ==================================================================================
// ============================= COMMON INCLUDE =====================================
// ==================================================================================

const marketplaceAccountInclude = {
  marketplace: true,
};

// ==================================================================================
// ========================= CREATE MARKETPLACE ACCOUNT =============================
// ==================================================================================

export const createMarketplaceAccount = async (data, tx = prisma) => {
  return tx.marketplaceAccount.create({
    data,
    include: marketplaceAccountInclude,
  });
};

// ==================================================================================
// ====================== GET MARKETPLACE ACCOUNT BY ID =============================
// ==================================================================================

export const getMarketplaceAccountById = async (id, tx = prisma) => {
  return tx.marketplaceAccount.findUnique({
    where: {
      id,
    },
    include: marketplaceAccountInclude,
  });
};

// ==================================================================================
// =================== GET MARKETPLACE ACCOUNT BY SELLER CODE =======================
// ==================================================================================

export const getMarketplaceAccountBySellerCode = async (
  userId,
  marketplaceId,
  sellerCode,
  tx = prisma
) => {
  return tx.marketplaceAccount.findFirst({
    where: {
      userId,
      marketplaceId,
      sellerCode,
    },
    include: marketplaceAccountInclude,
  });
};

// ==================================================================================
// ====================== GET MARKETPLACE ACCOUNTS ==================================
// ==================================================================================

export const getMarketplaceAccounts = async ({
  userId,
  page = 1,
  limit = 10,
  search = "",
  marketplaceId,
  connectionStatus,
  isActive,
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
        sellerName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        sellerCode: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        displayName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        marketplace: {
          marketplaceName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  // ======================================================
  // Marketplace Filter
  // ======================================================

  if (marketplaceId) {
    where.marketplaceId = marketplaceId;
  }

  // ======================================================
  // Connection Status
  // ======================================================

  if (connectionStatus) {
    where.connectionStatus = connectionStatus;
  }

  // ======================================================
  // Active Status
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
  // Sorting
  // ======================================================

  let orderBy = {
    [sortBy]: sortOrder,
  };

  if (sortBy === "marketplaceName") {
    orderBy = {
      marketplace: {
        marketplaceName: sortOrder,
      },
    };
  }

  // ======================================================
  // Query
  // ======================================================

  const [accounts, total] = await prisma.$transaction([
    prisma.marketplaceAccount.findMany({
      where,
      include: marketplaceAccountInclude,
      skip,
      take: currentLimit,
      orderBy,
    }),

    prisma.marketplaceAccount.count({
      where,
    }),
  ]);

  return {
    marketplaceAccounts: accounts,

    pagination: {
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
    },
  };
};

// ==================================================================================
// ========================= UPDATE MARKETPLACE ACCOUNT =============================
// ==================================================================================

export const updateMarketplaceAccount = async (
  id,
  data,
  tx = prisma
) => {
  return tx.marketplaceAccount.update({
    where: {
      id,
    },
    data,
    include: marketplaceAccountInclude,
  });
};

// ==================================================================================
// ========================= DELETE MARKETPLACE ACCOUNT =============================
// ==================================================================================

export const deleteMarketplaceAccount = async (id, tx = prisma) => {
  return tx.marketplaceAccount.delete({
    where: {
      id,
    },
  });
};