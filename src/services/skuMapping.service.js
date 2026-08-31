import {
  createSkuMapping,
  getSkuMappingById,
  getSkuMappingByShortSku,
  getSkuMappings,
  updateSkuMapping,
  deleteSkuMapping,
} from "../repositories/skuMapping.repository.js";

import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import ExcelJS from "exceljs";

// ==================================================================================
// ============================ GET SKU MAPPINGS ====================================
// ==================================================================================

export const getSkuMappingsService = async ({
  userId,
  page,
  limit,
  search,
  sortBy,
  sortOrder,
}) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  return await getSkuMappings({
    userId,
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  });
};

// ==================================================================================
// =========================== GET SKU MAPPING BY ID ================================
// ==================================================================================

export const getSkuMappingByIdService = async (id, userId) => {
  if (!id) {
    throw new AppError("SKU Mapping id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const skuMapping = await getSkuMappingById(id);

  if (!skuMapping) {
    throw new AppError("SKU Mapping not found.", 404);
  }

  if (skuMapping.userId !== userId) {
    throw new AppError(
      "You are not authorized to access this SKU Mapping.",
      403,
    );
  }

  return skuMapping;
};

// ==================================================================================
// ========================= GET SKU BY SHORT SKU ===================================
// ==================================================================================

export const getSkuMappingByShortSkuService = async (userId, shortSku) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  if (!shortSku?.trim()) {
    throw new AppError("Short SKU is required.", 400);
  }

  const skuMapping = await getSkuMappingByShortSku(
    userId,
    shortSku.trim().toUpperCase(),
  );

  if (!skuMapping) {
    throw new AppError("Short SKU not found.", 404);
  }

  return skuMapping;
};

// ==================================================================================
// ============================ DELETE SKU MAPPING ==================================
// ==================================================================================

export const deleteSkuMappingService = async (id, userId) => {
  if (!id) {
    throw new AppError("SKU Mapping id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const skuMapping = await getSkuMappingById(id);

  if (!skuMapping) {
    throw new AppError("SKU Mapping not found.", 404);
  }

  if (skuMapping.userId !== userId) {
    throw new AppError(
      "You are not authorized to delete this SKU Mapping.",
      403,
    );
  }

  await deleteSkuMapping(id);

  return {
    success: true,
    message: "SKU Mapping deleted successfully.",
  };
};

// ==================================================================================
// ============================ UPDATE SKU MAPPING ==================================
// ==================================================================================

export const updateSkuMappingService = async (id, userId, data) => {
  if (!id) {
    throw new AppError("SKU Mapping id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const skuMapping = await getSkuMappingById(id);

  if (!skuMapping) {
    throw new AppError("SKU Mapping not found.", 404);
  }

  if (skuMapping.userId !== userId) {
    throw new AppError(
      "You are not authorized to update this SKU Mapping.",
      403,
    );
  }

  return await updateSkuMapping(id, data);
};

// ==================================================================================
// ============================ IMPORT SKU MAPPING ==================================
// ==================================================================================

export const importSkuMappingService = async (userId, file) => {
  // ======================================================
  // Validate
  // ======================================================

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  if (!file) {
    throw new AppError("Excel file is required.", 400);
  }

  // ======================================================
  // Load Workbook
  // ======================================================

  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(file.buffer);

  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    throw new AppError("Worksheet not found.", 400);
  }

  // ======================================================
  // Header Mapping
  // ======================================================

  const headerRow = worksheet.getRow(1);

  const headerMap = {};

  headerRow.eachCell((cell, columnNumber) => {
    // headerMap[String(cell.value).trim()] = columnNumber;
    const header = String(cell.value ?? "").trim();

    if (header) {
      headerMap[header] = columnNumber;
    }
  });

  // ======================================================
  // Required Header
  // ======================================================

  const requiredHeaders = ["Short SKU", "Barcode SKU"];

  for (const header of requiredHeaders) {
    if (!headerMap[header]) {
      throw new AppError(`Missing required column : ${header}`, 400);
    }
  }

  // ======================================================
  // Read Rows
  // ======================================================

  const rows = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const shortSku = String(row.getCell(headerMap["Short SKU"]).value ?? "")
      .trim()
      .toUpperCase();

    const barcodeSku = String(
      row.getCell(headerMap["Barcode SKU"]).value ?? "",
    ).trim();

    const ordercookSku = String(
      row.getCell(headerMap["OrderCook SKU"]).value ?? "",
    ).trim();

    const brandName = String(
      row.getCell(headerMap["Brand Name"]).value ?? "",
    ).trim();

    const asinBarcode = String(
      row.getCell(headerMap["Asin (Barcode)"]).value ?? "",
    ).trim();

    const color = String(row.getCell(headerMap["Color"]).value ?? "").trim();

    const size = String(row.getCell(headerMap["Size"]).value ?? "").trim();

    const fullSku = String(
      row.getCell(headerMap["Full SKU"]).value ?? "",
    ).trim();

    const title = String(row.getCell(headerMap["Title"]).value ?? "").trim();

    const qtyValue = row.getCell(headerMap["QTY"]).value;

    const qty =
      qtyValue === null || qtyValue === undefined || qtyValue === ""
        ? null
        : Number(qtyValue);

    const mrpValue = headerMap["MRP"]
      ? row.getCell(headerMap["MRP"]).value
      : null;

    const mrp =
      mrpValue === null || mrpValue === undefined || mrpValue === ""
        ? null
        : Number(mrpValue);

    // Skip Empty Row

    if (!shortSku && !barcodeSku) {
      return;
    }

    rows.push({
      rowNumber,
      shortSku,
      barcodeSku,
      ordercookSku,
      brandName,
      asinBarcode,
      color,
      size,
      fullSku,
      title,
      qty,
      mrp,
    });
  });

  if (!rows.length) {
    throw new AppError("Excel file does not contain any data.", 400);
  }

  // ======================================================
  // Duplicate Short SKU Validation
  // ======================================================

  const duplicateMap = new Map();

  for (const row of rows) {
    const key = row.shortSku.toUpperCase().trim();

    if (duplicateMap.has(key)) {
      throw new AppError(
        `Duplicate Short SKU found in Excel: ${row.shortSku} (Row ${row.rowNumber})`,
        400,
      );
    }

    duplicateMap.set(key, true);
  }
  // ======================================================
  // Collect Short SKU
  // ======================================================

  const shortSkus = rows.map((row) => row.shortSku).filter(Boolean);

  // ======================================================
  // Transaction
  // ======================================================

  return await prisma.$transaction(
    async (tx) => {
      // ======================================================
      // Fetch Existing SKU Mappings
      // ======================================================

      const existingMappings = await tx.skuMapping.findMany({
        where: {
          userId,
          shortSku: {
            in: shortSkus,
          },
        },
      });

      // ======================================================
      // Create Map
      // ======================================================

      const mappingMap = new Map();

      for (const mapping of existingMappings) {
        mappingMap.set(mapping.shortSku.trim().toUpperCase(), mapping);
      }

      // ======================================================
      // Summary
      // ======================================================

      let inserted = 0;
      let updated = 0;
      let failed = 0;

      const errors = [];

      // ======================================================
      // Process Rows
      // ======================================================
      const createData = [];

      for (const row of rows) {
        // ==========================================
        // Validation
        // ==========================================

        if (!row.shortSku) {
          failed++;

          errors.push({
            row: row.rowNumber,
            shortSku: "",
            message: "Short SKU is required.",
          });

          continue;
        }

        if (!row.barcodeSku) {
          failed++;

          errors.push({
            row: row.rowNumber,
            shortSku: row.shortSku.toUpperCase(),
            message: "Barcode SKU is required.",
          });

          continue;
        }

        if (row.mrp !== null && (!Number.isFinite(row.mrp) || row.mrp < 0)) {
          failed++;

          errors.push({
            row: row.rowNumber,
            shortSku: row.shortSku,
            message: "MRP must be a valid non-negative number.",
          });

          continue;
        }

        // if (!row.ordercookSku) {
        //   failed++;

        //   errors.push({
        //     row: row.rowNumber,
        //     shortSku: row.shortSku,
        //     message: "OrderCook SKU is required.",
        //   });

        //   continue;
        // }

        // ==========================================
        // Check Existing
        // ==========================================

        // const existing = mappingMap.get(row.shortSku.toUpperCase());
        const existing = mappingMap.get(row.shortSku.trim().toUpperCase());

        // ==========================================
        // Update
        // ==========================================

        if (existing) {
          await tx.skuMapping.update({
            where: {
              id: existing.id,
            },
            data: {
              barcodeSku: row.barcodeSku.trim(),
              ordercookSku: row.ordercookSku || null,
              brandName: row.brandName || null,
              asinBarcode: row.asinBarcode || null,
              color: row.color || null,
              size: row.size || null,
              fullSku: row.fullSku || null,
              title: row.title || null,
              qty: row.qty,
              mrp: row.mrp,
            },
          });

          updated++;

          continue;
        }

        // ==========================================
        // Insert
        // ==========================================

        // await tx.skuMapping.create({
        //   data: {
        //     userId,

        //     shortSku: row.shortSku,

        //     barcodeSku: row.barcodeSku,

        //     ordercookSku: row.ordercookSku,
        //   },
        // });

        createData.push({
          userId,
          shortSku: row.shortSku.trim().toUpperCase(),
          barcodeSku: row.barcodeSku.trim(),

          ordercookSku: row.ordercookSku || null,
          brandName: row.brandName || null,
          asinBarcode: row.asinBarcode || null,
          color: row.color || null,
          size: row.size || null,
          fullSku: row.fullSku || null,
          title: row.title || null,
          qty: row.qty,
          mrp: row.mrp,
        });

        inserted++;

        // inserted++;
      }

      // ======================================================
      // Bulk Insert
      // ======================================================

      if (createData.length) {
        await tx.skuMapping.createMany({
          data: createData,
          skipDuplicates: true,
        });
      }

      // ======================================================
      // Response
      // ======================================================

      return {
        success: true,

        totalRows: rows.length,

        inserted,

        updated,

        failed,

        skipped: 0,

        errors,
      };
    },
    {
      maxWait: 10000,
      timeout: 60000,
    },
  );
};

export const getSkuSuggestionsService = async (userId, q) => {
  if (!q) return [];

  const data = await prisma.skuMapping.findMany({
    where: {
      userId,
      shortSku: {
        startsWith: q,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      shortSku: true,
    },
    orderBy: {
      shortSku: "asc",
    },
    take: 10,
  });

  return data;
};
