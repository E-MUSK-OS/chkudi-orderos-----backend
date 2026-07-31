import {
  getSkuMappingsService,
  getSkuMappingByIdService,
  getSkuMappingByShortSkuService,
  updateSkuMappingService,
  deleteSkuMappingService,
  importSkuMappingService,
  getSkuSuggestionsService,
} from "../services/skuMapping.service.js";

import { updateSkuMappingSchema } from "../validations/skuMapping.validation.js";

// ==================================================================================
// ============================== GET SKU MAPPINGS ==================================
// ==================================================================================


export const getSkuMappings = async (req, res, next) => {
  try {
    const result = await getSkuMappingsService({
      userId: req.user.id,

      page: req.query.page,

      limit: req.query.limit,

      search: req.query.search,

      sortBy: req.query.sortBy,

      sortOrder: req.query.sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "SKU Mappings fetched successfully.",
      data: result.skuMappings,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// =========================== GET SKU MAPPING BY ID ================================
// ==================================================================================

export const getSkuMappingById = async (req, res, next) => {
  try {
    const skuMapping = await getSkuMappingByIdService(
      req.params.id,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "SKU Mapping fetched successfully.",
      data: skuMapping,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ========================= GET SKU BY SHORT SKU ===================================
// ==================================================================================

export const getSkuMappingByShortSku = async (req, res, next) => {
  try {
    const skuMapping = await getSkuMappingByShortSkuService(
      req.user.id,
      req.query.shortSku,
    );

    return res.status(200).json({
      success: true,
      message: "SKU Mapping fetched successfully.",
      data: skuMapping,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================ UPDATE SKU MAPPING ==================================
// ==================================================================================

export const updateSkuMapping = async (req, res, next) => {
  try {
    const data = updateSkuMappingSchema.parse(req.body);

    const skuMapping = await updateSkuMappingService(
      req.params.id,
      req.user.id,
      data,
    );

    return res.status(200).json({
      success: true,
      message: "SKU Mapping updated successfully.",
      data: skuMapping,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================ DELETE SKU MAPPING ==================================
// ==================================================================================

export const deleteSkuMapping = async (req, res, next) => {
  try {
    const result = await deleteSkuMappingService(req.params.id, req.user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================ IMPORT SKU MAPPING ==================================
// ==================================================================================

export const importSkuMapping = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required.",
      });
    }

    const result = await importSkuMappingService(req.user.id, req.file);

    return res.status(200).json({
      success: true,
      message: "SKU Mapping imported successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSkuSuggestionsController = async (req, res, next) => {
  try {
    const result = await getSkuSuggestionsService(
      req.user.id,
      req.query.q
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};