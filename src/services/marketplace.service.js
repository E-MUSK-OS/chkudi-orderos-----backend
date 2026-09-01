import {
  createMarketplace,
  getMarketplaceById,
  getMarketplaceByCode,
  getMarketplaceByName,
  getMarketplaces,
  updateMarketplace,
  deleteMarketplace,
} from "../repositories/marketplace.repository.js";

// ==================================================================================
// =========================== CREATE MARKETPLACE ===================================
// ==================================================================================

export const createMarketplaceService = async (data) => {
  // ======================================================
  // Duplicate Name
  // ======================================================

  const existingName = await getMarketplaceByName(data.marketplaceName);

  if (existingName) {
    throw new Error("Marketplace name already exists.");
  }

  // ======================================================
  // Duplicate Code
  // ======================================================

  const existingCode = await getMarketplaceByCode(data.marketplaceCode);

  if (existingCode) {
    throw new Error("Marketplace code already exists.");
  }

  // ======================================================
  // Create Marketplace
  // ======================================================

  return await createMarketplace(data);
};

// ==================================================================================
// =========================== GET ALL MARKETPLACES =================================
// ==================================================================================

export const getMarketplacesService = async (query) => {
  return await getMarketplaces(query);
};

// ==================================================================================
// =========================== GET MARKETPLACE BY ID ================================
// ==================================================================================

export const getMarketplaceByIdService = async (id) => {
  const marketplace = await getMarketplaceById(id);

  if (!marketplace) {
    throw new Error("Marketplace not found.");
  }

  return marketplace;
};

// ==================================================================================
// ============================ UPDATE MARKETPLACE ==================================
// ==================================================================================

export const updateMarketplaceService = async (id, data) => {
  const marketplace = await getMarketplaceById(id);

  if (!marketplace) {
    throw new Error("Marketplace not found.");
  }

  // ======================================================
  // Duplicate Name
  // ======================================================

  if (data.marketplaceName) {
    const existingName = await getMarketplaceByName(data.marketplaceName);

    if (existingName && existingName.id !== id) {
      throw new Error("Marketplace name already exists.");
    }
  }

  // ======================================================
  // Duplicate Code
  // ======================================================

  if (data.marketplaceCode) {
    const existingCode = await getMarketplaceByCode(data.marketplaceCode);

    if (existingCode && existingCode.id !== id) {
      throw new Error("Marketplace code already exists.");
    }
  }

  return await updateMarketplace(id, data);
};

// ==================================================================================
// ============================ DELETE MARKETPLACE ==================================
// ==================================================================================

export const deleteMarketplaceService = async (id) => {
  const marketplace = await getMarketplaceById(id);

  if (!marketplace) {
    throw new Error("Marketplace not found.");
  }

  // ======================================================
  // Hard Delete
  // ======================================================

  return await deleteMarketplace(id);

  // ======================================================
  // Soft Delete (Recommended)
  // ======================================================
  // return await updateMarketplace(id, {
  //   isActive: false,
  // });
};

// ==================================================================================
// ====================== TOGGLE MARKETPLACE STATUS =================================
// ==================================================================================

export const toggleMarketplaceStatusService = async (id) => {
  const marketplace = await getMarketplaceById(id);

  if (!marketplace) {
    throw new Error("Marketplace not found.");
  }

  return await updateMarketplace(id, {
    isActive: !marketplace.isActive,
  });
};
