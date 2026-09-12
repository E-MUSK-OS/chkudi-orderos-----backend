import * as xlsx from "xlsx";
import {
  bulkCreateAsinImports,
  getAsinImports,
  deleteAsinImportById,
  updateAsinImportById,
  deleteAllAsinImportsByUser,
  upsertAsinImport,
} from "../repositories/asinImport.repository.js";

/**
 * Import ASIN list from Excel file
 */
export const importAsinFromExcelService = async (userId, fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("No file uploaded.");
  }

  // Use xlsx to safely read the file buffer, avoiding exceljs table parsing crashes
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("Excel sheet is empty.");
  }

  // Parse to array of arrays
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (rows.length < 2) {
    throw new Error("No valid ASIN data found in Excel file.");
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
        const extracted = String(row[colNum] || "").trim();
        if (extracted) {
          return extracted;
        }
      }
    }
    return "";
  };

  const itemsToCreate = [];

  for (let rowNum = 1; rowNum < rows.length; rowNum++) {
    const row = rows[rowNum];

    let asin = getColValue(row, ["asin", "asincode", "amazonasin", "shortsku", "barcodesku"]);
    let sku = getColValue(row, ["sku", "mastersku", "productsku", "sellersku", "fullsku"]);
    let generateBarcode = getColValue(row, [
      "genratebarcode",
      "generatebarcode",
      "barcode",
      "barcodesku",
      "asinbarcode",
    ]);
    let rackAddress = getColValue(row, [
      "rackaddress",
      "rack",
      "racklocation",
      "address",
      "location",
    ]);

    // Positional fallback if headers did not match named keys
    if (!asin && !sku) {
      const col1 = String(row[0] || "").trim();
      const col2 = String(row[1] || "").trim();
      const col3 = String(row[2] || "").trim();
      const col4 = String(row[3] || "").trim();

      if (col1 || col2) {
        asin = col1;
        sku = col2 || col1;
        generateBarcode = col3 || sku || asin;
        rackAddress = col4 || null;
      }
    }

    if (!asin && !sku) {
      continue;
    }

    itemsToCreate.push({
      asin: asin || "",
      sku: sku || "",
      generateBarcode: generateBarcode || sku || asin || "",
      rackAddress: rackAddress || null,
      userId,
    });
  }

  if (itemsToCreate.length === 0) {
    throw new Error("No valid ASIN data found in Excel file.");
  }

  const result = await bulkCreateAsinImports(itemsToCreate);

  return {
    count: result.count,
    itemsCreated: itemsToCreate.length,
  };
};

/**
 * Get ASIN imports for user
 */
export const getAsinImportsService = async (userId, { search } = {}) => {
  return getAsinImports({ userId, search });
};

/**
 * Delete ASIN import by ID
 */
export const deleteAsinImportService = async (id, userId) => {
  return deleteAsinImportById(id, userId);
};

/**
 * Update ASIN import by ID
 */
export const updateAsinImportService = async (id, userId, data) => {
  return updateAsinImportById(id, userId, data);
};

/**
 * Clear all ASIN imports
 */
export const clearAsinImportsService = async (userId) => {
  return deleteAllAsinImportsByUser(userId);
};

/**
 * Create single ASIN import record
 */
export const createAsinImportService = async (userId, data) => {
  if (!data.asin || !data.asin.trim()) {
    throw new Error("ASIN is required.");
  }
  return await upsertAsinImport({
    userId,
    asin: data.asin.trim(),
    sku: data.sku ? data.sku.trim() : "",
    rackAddress: data.rackAddress ? data.rackAddress.trim() : null,
    generateBarcode: data.generateBarcode ? data.generateBarcode.trim() : data.sku || data.asin.trim(),
  });
};

