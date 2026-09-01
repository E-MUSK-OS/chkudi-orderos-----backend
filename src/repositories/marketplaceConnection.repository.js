import prisma from "../config/prisma.js";

// ==================================================================================
// ======================= FIND BY ID ===============================================
// ==================================================================================

export const findMarketplaceConnectionByIdRepository = (id) => {
  return prisma.marketplaceConnection.findUnique({
    where: {
      id,
    },
  });
};

// ==================================================================================
// ================= FIND BY MARKETPLACE ACCOUNT ID =================================
// ==================================================================================

export const findMarketplaceConnectionByMarketplaceAccountIdRepository = (
  marketplaceAccountId,
) => {
  return prisma.marketplaceConnection.findUnique({
    where: {
      marketplaceAccountId,
    },
  });
};

// ==================================================================================
// ======================= CREATE ===================================================
// ==================================================================================

export const createMarketplaceConnectionRepository = (data) => {
  return prisma.marketplaceConnection.create({
    data,
    include: {
      marketplaceAccount: {
        include: {
          marketplace: true,
        },
      },
    },
  });
};

// ==================================================================================
// ======================= UPDATE ===================================================
// ==================================================================================

export const updateMarketplaceConnectionRepository = (
  marketplaceAccountId,
  data,
) => {
  return prisma.marketplaceConnection.update({
    where: {
      marketplaceAccountId,
    },
    data,
    include: {
      marketplaceAccount: {
        include: {
          marketplace: true,
        },
      },
    },
  });
};

// ==================================================================================
// ======================= DELETE ===================================================
// ==================================================================================

export const deleteMarketplaceConnectionRepository = (marketplaceAccountId) => {
  return prisma.marketplaceConnection.delete({
    where: {
      marketplaceAccountId,
    },
  });
};

// ==================================================================================
// ======================= UPDATE STATUS ============================================
// ==================================================================================

export const updateMarketplaceConnectionStatusRepository = (
  marketplaceAccountId,
  status,
  lastError = null,
) => {
  return prisma.marketplaceConnection.update({
    where: {
      marketplaceAccountId,
    },
    data: {
      status,
      lastError,

      lastConnectedAt: status === "CONNECTED" ? new Date() : undefined,
    },
  });
};

// ==================================================================================
// ======================= UPDATE LAST SYNC =========================================
// ==================================================================================

export const updateMarketplaceLastSyncRepository = (marketplaceAccountId) => {
  return prisma.marketplaceConnection.update({
    where: {
      marketplaceAccountId,
    },
    data: {
      lastSyncAt: new Date(),
    },
  });
};

// ==================================================================================
// ======================= UPDATE CREDENTIALS =======================================
// ==================================================================================

export const updateMarketplaceCredentialsRepository = (
  marketplaceAccountId,
  credentials,
  environment,
) => {
  return prisma.marketplaceConnection.update({
    where: {
      marketplaceAccountId,
    },
    data: {
      credentials,
      environment,
    },
  });
};
