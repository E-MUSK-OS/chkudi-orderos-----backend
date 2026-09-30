import {
  importMyntraFromExcelService,
  getMyntraImportsService,
  getAllMyntraMappingsService,
  deleteMyntraImportService,
  clearAllMyntraImportsService,
  createMyntraImportService,
  updateMyntraImportService,
} from "../services/myntraImport.service.js";

/**
 * Import Myntra mappings from uploaded Excel file
 */
export const importMyntraExcel = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const fileBuffer = req.file?.buffer;

    const result = await importMyntraFromExcelService(userId, fileBuffer);

    res.status(200).json({
      success: true,
      message: result.message || "Myntra SKU mappings imported successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated list of Myntra imports for the user
 */
export const getMyntraImports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, search } = req.query;

    const result = await getMyntraImportsService(userId, { page, limit, search });

    res.status(200).json({
      success: true,
      data: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Myntra mappings dictionary for O(1) picklist lookup
 */
export const getAllMyntraMappings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await getAllMyntraMappingsService(userId);

    res.status(200).json({
      success: true,
      mappings: result.mappings,
      items: result.items,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single Myntra import record
 */
export const deleteMyntraImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await deleteMyntraImportService(id, userId);

    res.status(200).json({
      success: true,
      message: "Myntra mapping record deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all Myntra import records for user
 */
export const clearAllMyntraImports = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await clearAllMyntraImportsService(userId);

    res.status(200).json({
      success: true,
      message: "All Myntra mapping records cleared successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create single Myntra import record
 */
export const createMyntraImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { myntraSku, sellerSku, rackAddress } = req.body;
    const generateBarcode = req.body.generateBarcode || req.body.generatedBarcode;

    const result = await createMyntraImportService(userId, {
      myntraSku,
      sellerSku,
      generateBarcode,
      rackAddress,
    });

    res.status(201).json({
      success: true,
      message: "Myntra mapping record created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update single Myntra import record
 */
export const updateMyntraImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { myntraSku, sellerSku, rackAddress } = req.body;
    const generateBarcode = req.body.generateBarcode || req.body.generatedBarcode;

    await updateMyntraImportService(id, userId, {
      myntraSku,
      sellerSku,
      generateBarcode,
      rackAddress,
    });

    res.status(200).json({
      success: true,
      message: "Myntra mapping record updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

