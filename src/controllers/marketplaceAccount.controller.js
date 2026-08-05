import {
  createMarketplaceAccountService,
  getMarketplaceAccountsService,
  getMarketplaceAccountByIdService,
  updateMarketplaceAccountService,
  deleteMarketplaceAccountService,
  toggleMarketplaceAccountStatusService,
} from "../services/marketplaceAccount.service.js";

import {
  createMarketplaceAccountSchema,
  updateMarketplaceAccountSchema,
} from "../validations/marketplaceAccount.validation.js";

// ==================================================================================
// ======================= CREATE MARKETPLACE ACCOUNT ===============================
// ==================================================================================

export const createMarketplaceAccount = async (req, res, next) => {
  try {
    const data = createMarketplaceAccountSchema.parse(req.body);

    const account = await createMarketplaceAccountService(
      req.user.id,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Marketplace account created successfully.",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ======================= GET ALL MARKETPLACE ACCOUNTS =============================
// ==================================================================================

export const getMarketplaceAccounts = async (req, res, next) => {
  try {
    const result = await getMarketplaceAccountsService(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      marketplaceId: req.query.marketplaceId,
      connectionStatus: req.query.connectionStatus,
      isActive:
        req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Marketplace accounts fetched successfully.",
      data: result.marketplaceAccounts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ==================== GET MARKETPLACE ACCOUNT BY ID ===============================
// ==================================================================================

export const getMarketplaceAccountById = async (req, res, next) => {
  try {
    const account = await getMarketplaceAccountByIdService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Marketplace account fetched successfully.",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ======================= UPDATE MARKETPLACE ACCOUNT ===============================
// ==================================================================================

export const updateMarketplaceAccount = async (req, res, next) => {
  try {
    const data = updateMarketplaceAccountSchema.parse(req.body);

    const account = await updateMarketplaceAccountService(
      req.params.id,
      req.user.id,
      data
    );

    return res.status(200).json({
      success: true,
      message: "Marketplace account updated successfully.",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ======================= DELETE MARKETPLACE ACCOUNT ===============================
// ==================================================================================

export const deleteMarketplaceAccount = async (req, res, next) => {
  try {
    await deleteMarketplaceAccountService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: "Marketplace account deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// =================== TOGGLE MARKETPLACE ACCOUNT STATUS ============================
// ==================================================================================

export const toggleMarketplaceAccountStatus = async (
  req,
  res,
  next
) => {
  try {
    const account =
      await toggleMarketplaceAccountStatusService(
        req.params.id,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      message: `Marketplace account ${
        account.isActive ? "activated" : "deactivated"
      } successfully.`,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};