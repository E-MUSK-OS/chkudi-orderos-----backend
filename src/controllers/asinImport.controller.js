import {
  importAsinFromExcelService,
  getAsinImportsService,
  deleteAsinImportService,
  updateAsinImportService,
  clearAsinImportsService,
} from "../services/asinImport.service.js";

/**
 * Import ASIN from Excel file
 */
export const importAsinFromExcel = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const fileBuffer = req.file?.buffer;

    const result = await importAsinFromExcelService(userId, fileBuffer);

    res.status(201).json({
      success: true,
      message: `${result.itemsCreated} ASIN record(s) imported successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all ASIN imports for user
 */
export const getAsinImports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search } = req.query;

    const result = await getAsinImportsService(userId, { search });

    res.status(200).json({
      success: true,
      data: result.items,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update single ASIN import
 */
export const updateAsinImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { asin, sku, generateBarcode, rackAddress } = req.body;

    await updateAsinImportService(id, userId, {
      asin,
      sku,
      generateBarcode,
      rackAddress,
    });

    res.status(200).json({
      success: true,
      message: "ASIN record updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete single ASIN import
 */
export const deleteAsinImport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await deleteAsinImportService(id, userId);

    res.status(200).json({
      success: true,
      message: "ASIN record deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all ASIN imports
 */
export const clearAsinImports = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await clearAsinImportsService(userId);

    res.status(200).json({
      success: true,
      message: "All ASIN records cleared successfully.",
    });
  } catch (error) {
    next(error);
  }
};

