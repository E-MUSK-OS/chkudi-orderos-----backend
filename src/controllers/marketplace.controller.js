import {
  createMarketplaceService,
  getMarketplacesService,
  getMarketplaceByIdService,
  updateMarketplaceService,
  deleteMarketplaceService,
  toggleMarketplaceStatusService,
} from "../services/marketplace.service.js";

import {
  createMarketplaceSchema,
  updateMarketplaceSchema,
} from "../validations/marketplace.validation.js";

// ==================================================================================
// ============================ CREATE MARKETPLACE ==================================
// ==================================================================================

export const createMarketplace = async (req, res, next) => {
  try {
    const data = createMarketplaceSchema.parse(req.body);

    const marketplace = await createMarketplaceService(data);

    return res.status(201).json({
      success: true,
      message: "Marketplace created successfully.",
      data: marketplace,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// =========================== GET ALL MARKETPLACES =================================
// ==================================================================================

export const getMarketplaces = async (req, res, next) => {
  try {
    const result = await getMarketplacesService({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      isActive:
        req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Marketplaces fetched successfully.",
      data: result.marketplaces,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ========================== GET MARKETPLACE BY ID =================================
// ==================================================================================

export const getMarketplaceById = async (req, res, next) => {
  try {
    const marketplace = await getMarketplaceByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Marketplace fetched successfully.",
      data: marketplace,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// =========================== UPDATE MARKETPLACE ===================================
// ==================================================================================

export const updateMarketplace = async (req, res, next) => {
  try {
    const data = updateMarketplaceSchema.parse(req.body);

    const marketplace = await updateMarketplaceService(
      req.params.id,
      data
    );

    return res.status(200).json({
      success: true,
      message: "Marketplace updated successfully.",
      data: marketplace,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// =========================== DELETE MARKETPLACE ===================================
// ==================================================================================

export const deleteMarketplace = async (req, res, next) => {
  try {
    await deleteMarketplaceService(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Marketplace deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ======================= TOGGLE MARKETPLACE STATUS ================================
// ==================================================================================

export const toggleMarketplaceStatus = async (req, res, next) => {
  try {
    const marketplace = await toggleMarketplaceStatusService(req.params.id);

    return res.status(200).json({
      success: true,
      message: `Marketplace ${
        marketplace.isActive ? "activated" : "deactivated"
      } successfully.`,
      data: marketplace,
    });
  } catch (error) {
    next(error);
  }
};