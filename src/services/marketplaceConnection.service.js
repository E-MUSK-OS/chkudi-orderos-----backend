import { getMarketplaceAccountById } from "../repositories/marketplaceAccount.repository.js";

import {
  findMarketplaceConnectionByMarketplaceAccountIdRepository,
  createMarketplaceConnectionRepository,
  updateMarketplaceConnectionRepository,
  deleteMarketplaceConnectionRepository,
  updateMarketplaceConnectionStatusRepository,
} from "../repositories/marketplaceConnection.repository.js";

// ==================================================================================
// ======================= GET MARKETPLACE CONNECTION ================================
// ==================================================================================

export const getMarketplaceConnectionService = async (marketplaceAccountId) => {
  const marketplaceAccount =
    await findMarketplaceAccountByIdRepository(marketplaceAccountId);

  if (!marketplaceAccount) {
    throw new Error("Marketplace account not found.");
  }

  const connection =
    await findMarketplaceConnectionByMarketplaceAccountIdRepository(
      marketplaceAccountId,
    );

  if (!connection) {
    return null;
  }

  return connection;
};

// ==================================================================================
// ======================= CONNECT MARKETPLACE =======================================
// ==================================================================================

export const connectMarketplaceService = async (
  marketplaceAccountId,
  payload,
) => {
  const marketplaceAccount =
    await findMarketplaceAccountByIdRepository(marketplaceAccountId);

  if (!marketplaceAccount) {
    throw new Error("Marketplace account not found.");
  }

  const existingConnection =
    await findMarketplaceConnectionByMarketplaceAccountIdRepository(
      marketplaceAccountId,
    );

  if (existingConnection) {
    return await updateMarketplaceConnectionRepository(marketplaceAccountId, {
      credentials: payload.credentials,

      environment: payload.environment,

      status: "CONNECTED",

      lastConnectedAt: new Date(),

      lastError: null,
    });
  }

  return await createMarketplaceConnectionRepository({
    marketplaceAccountId,

    credentials: payload.credentials,

    environment: payload.environment,

    status: "CONNECTED",

    lastConnectedAt: new Date(),
  });
};
