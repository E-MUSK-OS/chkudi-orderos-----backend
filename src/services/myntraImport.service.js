import * as xlsx from "xlsx";
import {
  bulkUpsertMyntraImports,
  getMyntraImports,
  getAllMyntraMappingsByUser,
  deleteMyntraImportById,
  deleteAllMyntraImportsByUser,
  updateMyntraImportById,
  createMyntraImportRecord,
} from "../repositories/myntraImport.repository.js";

/**
 * Import Myntra SKU mapping from Excel file
 */
export const importMyntraFromExcelService = async (userId, fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("No file uploaded.");
  }

  // Use xlsx to safely read the file buffer
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("Excel sheet is empty.");
  }

  // Parse to array of arrays
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (rows.length < 2) {
    throw new Error("No valid Myntra data found in Excel file.");
  }

  const headerRow = rows[0];
  const headerMap = {};

  headerRow.forEach((cellVal, colIndex) => {
    const rawText = String(cellVal || "").trim();
    const headerText = rawText.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (headerText) {
      headerMap[headerText] = colIndex;
    }
  });

  const getColValue = (row, fieldKeys) => {
    for (const key of fieldKeys) {
      const colNum = headerMap[key];
      if (colNum !== undefined) {
        const extracted = String(row[colNum] ?? "").trim();
        if (extracted) {
          return extracted;
        }
      }
    }
    return "";
  };

  const rackAliases = ["rackaddress", "rack", "racklocation", "location", "shelf"];
  const myntraSkuAliases = ["myntrasku", "myntraskucode", "platformsku", "sku"];
  const sellerSkuAliases = ["sellersku", "sellerskucode", "mastersku", "productsku"];
  const asinAliases = ["asin", "amazonasin", "asincode"];
  const barcodeAliases = [
    "generatedbarcode",
    "generatebarcode",
    "genratebarcode",
    "barcode",
    "barcodesku",
  ];

  const itemsToCreate = [];

  for (let rowNum = 1; rowNum < rows.length; rowNum++) {
    const row = rows[rowNum];
    if (!row || !Array.isArray(row)) continue;

    let rackAddress = getColValue(row, rackAliases);
    let myntraSku = getColValue(row, myntraSkuAliases);
    let sellerSku = getColValue(row, sellerSkuAliases);
    let asin = getColValue(row, asinAliases);
    let generatedBarcode = getColValue(row, barcodeAliases);

    // Positional fallback if headers did not match named keys
    // Demo sheet order: Rack Address (0), Myntra SKU (1), Seller SKU (2), ASIN (3), Generated Barcode (4)
    if (!myntraSku && !sellerSku) {
      const col0 = String(row[0] ?? "").trim();
      const col1 = String(row[1] ?? "").trim();
      const col2 = String(row[2] ?? "").trim();
      const col3 = String(row[3] ?? "").trim();
      const col4 = String(row[4] ?? "").trim();

      if (col1 || col2) {
        rackAddress = col0;
        myntraSku = col1 || col2;
        sellerSku = col2 || col1;
        asin = col3 || null;
        generatedBarcode = col4 || sellerSku || myntraSku;
      }
    }

    if (!myntraSku) {
      continue;
    }

    itemsToCreate.push({
      rackAddress: rackAddress || null,
      myntraSku: myntraSku.trim(),
      sellerSku: sellerSku ? sellerSku.trim() : null,
      asin: asin ? asin.trim() : null,
      generatedBarcode: generatedBarcode
        ? generatedBarcode.trim()
        : sellerSku
        ? sellerSku.trim()
        : myntraSku.trim(),
    });
  }

  if (itemsToCreate.length === 0) {
    throw new Error(
      "No valid Myntra data found in Excel file. Ensure 'Myntra SKU' column exists."
    );
  }

  const result = await bulkUpsertMyntraImports(userId, itemsToCreate);

  const parts = [];
  if (result.createdCount > 0) parts.push(`${result.createdCount} new SKU(s) added`);
  if (result.updatedCount > 0) parts.push(`${result.updatedCount} updated with latest data`);
  if (result.duplicatesRemoved > 0) parts.push(`${result.duplicatesRemoved} duplicate(s) removed`);

  let message = `Processed ${result.totalProcessed} Myntra SKU(s)`;
  if (parts.length > 0) {
    message += `: ${parts.join(", ")}.`;
  } else {
    message += " (all records up to date).";
  }

  return {
    ...result,
    message,
  };
};

/**
 * Get all Myntra SKU mappings for user (for picklist cross-matching)
 */
export const getAllMyntraMappingsService = async (userId) => {
  return getAllMyntraMappingsByUser(userId);
};

/**
 * Get paginated Myntra imports for user
 */
export const getMyntraImportsService = async (userId, query = {}) => {
  return getMyntraImports(userId, query);
};

/**
 * Delete single Myntra import by ID
 */
export const deleteMyntraImportService = async (id, userId) => {
  return deleteMyntraImportById(id, userId);
};

/**
 * Clear all Myntra imports for user
 */
export const clearAllMyntraImportsService = async (userId) => {
  return deleteAllMyntraImportsByUser(userId);
};

/**
 * Update Myntra import by ID
 */
export const updateMyntraImportService = async (id, userId, data) => {
  const updateData = {};
  if (data.myntraSku !== undefined) updateData.myntraSku = data.myntraSku.trim();
  if (data.sellerSku !== undefined) updateData.sellerSku = data.sellerSku?.trim() || null;
  if (data.asin !== undefined) updateData.asin = data.asin?.trim() || null;
  if (data.generatedBarcode !== undefined)
    updateData.generatedBarcode = data.generatedBarcode?.trim() || null;
  if (data.rackAddress !== undefined)
    updateData.rackAddress = data.rackAddress?.trim() || null;

  return updateMyntraImportById(id, userId, updateData);
};

/**
 * Create single Myntra import record
 */
export const createMyntraImportService = async (userId, data) => {
  if (!data.myntraSku || !data.myntraSku.trim()) {
    throw new Error("Myntra SKU is required.");
  }
  return createMyntraImportRecord(userId, data);
};

