import {
  createMarketplaceAccount,
  getMarketplaceAccountById,
  getMarketplaceAccountBySellerCode,
  getMarketplaceAccounts,
  updateMarketplaceAccount,
  deleteMarketplaceAccount,
} from "../repositories/marketplaceAccount.repository.js";

import {
  getMarketplaceById,
} from "../repositories/marketplace.repository.js";

// ==================================================================================
// ======================= CREATE MARKETPLACE ACCOUNT ===============================
// ==================================================================================

export const createMarketplaceAccountService = async (
  userId,
  data
) => {

  // ======================================================
  // Marketplace Exists
  // ======================================================

  const marketplace = await getMarketplaceById(
    data.marketplaceId
  );

  if (!marketplace) {
    throw new Error("Marketplace not found.");
  }

  // ======================================================
  // Duplicate Seller Code
  // ======================================================

  const existingAccount =
    await getMarketplaceAccountBySellerCode(
      userId,
      data.marketplaceId,
      data.sellerCode
    );

  if (existingAccount) {
    throw new Error(
      "Seller code already exists for this marketplace."
    );
  }

  // ======================================================
  // Create
  // ======================================================

  return await createMarketplaceAccount({
    ...data,
    userId,
  });
};

// ==================================================================================
// ======================= GET MARKETPLACE ACCOUNTS ================================
// ==================================================================================

export const getMarketplaceAccountsService = async (
  userId,
  query
) => {
  return await getMarketplaceAccounts({
    userId,
    ...query,
  });
};

// ==================================================================================
// ====================== GET MARKETPLACE ACCOUNT BY ID ============================
// ==================================================================================

export const getMarketplaceAccountByIdService = async (
  id,
  userId
) => {

  const account =
    await getMarketplaceAccountById(id);

  if (!account) {
    throw new Error("Marketplace account not found.");
  }

  if (account.userId !== userId) {
    throw new Error("Unauthorized.");
  }

  return account;
};

// ==================================================================================
// ======================= UPDATE MARKETPLACE ACCOUNT ===============================
// ==================================================================================

export const updateMarketplaceAccountService = async (
  id,
  userId,
  data
) => {

  const account =
    await getMarketplaceAccountById(id);

  if (!account) {
    throw new Error("Marketplace account not found.");
  }

  if (account.userId !== userId) {
    throw new Error("Unauthorized.");
  }

  // ======================================================
  // Duplicate Seller Code
  // ======================================================

  if (data.sellerCode) {

    const existing =
      await getMarketplaceAccountBySellerCode(
        userId,
        account.marketplaceId,
        data.sellerCode
      );

    if (existing && existing.id !== id) {
      throw new Error(
        "Seller code already exists."
      );
    }
  }

  return await updateMarketplaceAccount(id, data);
};

// ==================================================================================
// ======================= DELETE MARKETPLACE ACCOUNT ===============================
// ==================================================================================

export const deleteMarketplaceAccountService = async (
  id,
  userId
) => {

  const account =
    await getMarketplaceAccountById(id);

  if (!account) {
    throw new Error("Marketplace account not found.");
  }

  if (account.userId !== userId) {
    throw new Error("Unauthorized.");
  }

  return await deleteMarketplaceAccount(id);
};

// ==================================================================================
// ====================== TOGGLE MARKETPLACE STATUS ================================
// ==================================================================================

export const toggleMarketplaceAccountStatusService =
  async (id, userId) => {

    const account =
      await getMarketplaceAccountById(id);

    if (!account) {
      throw new Error("Marketplace account not found.");
    }

    if (account.userId !== userId) {
      throw new Error("Unauthorized.");
    }

    return await updateMarketplaceAccount(id, {
      isActive: !account.isActive,
    });
  };