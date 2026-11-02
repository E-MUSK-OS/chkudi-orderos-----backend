import fs from 'fs';
import path from 'path';
import { getProductImageDir, sanitizeFileName } from '../utils/productImagePath.js';
import {
  countProductsByUserId,
  createProduct,
  getProductsByUserId,
  getProductById,
  updateProduct,
  deleteProduct,
  findProductByName,
  findProductByAsin,
  findProductByMasterSku,
  updateProductStatus,
  getProductStats,
  upsertDropdownOption,
  getDropdownOptionsByUserId,
  getPartiesByUserId,
} from "../repositories/product.repository.js";
import { updateVariantsStatusByProduct } from "../repositories/productVariant.repository.js";
import { upsertAsinImport } from "../repositories/asinImport.repository.js";
import prisma from "../config/prisma.js";
import { syncProductInventoryService } from "./inventory.service.js";

// ======================================================
// Validate Product Attributes
// ======================================================

const validateAttributes = (attributes = []) => {
  if (!attributes?.length) {
    return;
  }

  const names = attributes.map((item) =>
    item.attributeName.trim().toLowerCase(),
  );

  const duplicates = names.filter(
    (name, index) => names.indexOf(name) !== index,
  );

  if (duplicates.length > 0) {
    throw new Error(`Duplicate attribute found: ${duplicates[0]}`);
  }
};

// ======================================================
// Create Product
// ======================================================

export const createProductService = async (userId, data) => {
  // Maximum Product Limit
  const totalProducts = await countProductsByUserId(userId);

  if (totalProducts >= 100000) {
    throw new Error(
      "Maximum limit reached. You can create up to 100000 products only.",
    );
  }

  // Duplicate ASIN Check
  if (data.asin && data.asin.trim()) {
    const existingAsin = await findProductByAsin(data.asin.trim(), userId);

    if (existingAsin) {
      throw new Error("ASIN already exists.");
    }
  }

  validateAttributes(data.attributes);

  const product = await createProduct({
    ...data,
    asin: data.asin?.trim() || null,
    myntraSku: data.myntraSku?.trim() || null,
    fsnCode: data.fsnCode?.trim() || null,
    generateBarcode: data.generateBarcode ? data.generateBarcode.trim() : "No",
    isActive: data.isActive ?? true,
    userId,
  });

  // Automatically sync to AsinImport table when ASIN is provided
  if (data.asin && data.asin.trim()) {
    try {
      await upsertAsinImport({
        userId,
        asin: data.asin.trim(),
        sku: data.masterSku ? data.masterSku.trim() : "",
        rackAddress: data.rackAddress ? data.rackAddress.trim() : null,
        generateBarcode: data.generateBarcode ? data.generateBarcode.trim() : "No",
      });
    } catch (asinErr) {
      console.error("Failed to sync ASIN to AsinImport:", asinErr);
    }
  }

  await autoPersistProductOptions(userId, data);
  await syncProductInventoryService(product.id, userId);
  return product;
};



// ======================================================
// Get All Products
// ======================================================

export const getAllProductsService = async (userId) => {
  return await getProductsByUserId(userId);
};

// ======================================================
// Get Product By Id
// ======================================================

export const getProductByIdService = async (id, userId) => {
  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  return product;
};

// ======================================================
// Update Product
// ======================================================

export const updateProductService = async (id, userId, data) => {
  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  // Duplicate ASIN
  if (data.asin && data.asin.trim() && data.asin.trim() !== product.asin) {
    const existing = await findProductByAsin(data.asin.trim(), userId);

    if (existing) {
      throw new Error("ASIN already exists.");
    }
  }

  if (data.attributes) {
    validateAttributes(data.attributes);
  }

  await updateProduct(id, {
    ...data,
    ...(data.asin !== undefined ? { asin: data.asin?.trim() || null } : {}),
    ...(data.myntraSku !== undefined ? { myntraSku: data.myntraSku?.trim() || null } : {}),
    ...(data.fsnCode !== undefined ? { fsnCode: data.fsnCode?.trim() || null } : {}),
    ...(data.generateBarcode !== undefined ? { generateBarcode: data.generateBarcode?.trim() || "No" } : {}),
  });

  const updatedProduct = await getProductById(id, userId);

  const barcodeVal = (data.generateBarcode !== undefined ? data.generateBarcode : updatedProduct.generateBarcode)?.trim() || "No";

  // Cascade generateBarcode to variants if updated
  if (data.generateBarcode !== undefined) {
    try {
      await prisma.productVariant.updateMany({
        where: { productId: id },
        data: { generateBarcode: barcodeVal },
      });
    } catch (vErr) {
      console.error("Failed to sync generateBarcode to product variants:", vErr);
    }
  }

  // Sync parent product to AsinImport table on update
  const effectiveAsin = (data.asin !== undefined ? data.asin : updatedProduct.asin)?.trim();
  const effectiveSku = (data.masterSku !== undefined ? data.masterSku : updatedProduct.masterSku)?.trim();
  const effectiveRack = (data.rackAddress !== undefined ? data.rackAddress : updatedProduct.rackAddress)?.trim();

  if (effectiveAsin) {
    try {
      await upsertAsinImport({
        userId,
        asin: effectiveAsin,
        sku: effectiveSku || "",
        rackAddress: effectiveRack || null,
        generateBarcode: barcodeVal,
      });
    } catch (asinErr) {
      console.error("Failed to sync ASIN to AsinImport on product update:", asinErr);
    }
  }

  // Also cascade generateBarcode to AsinImport for all child variants with an ASIN
  if (data.generateBarcode !== undefined) {
    try {
      const childVariants = await prisma.productVariant.findMany({
        where: { productId: id },
        select: { asin: true, variantSku: true, rackAddress: true },
      });

      for (const cv of childVariants) {
        if (cv.asin && cv.asin.trim()) {
          await upsertAsinImport({
            userId,
            asin: cv.asin.trim(),
            sku: cv.variantSku ? cv.variantSku.trim() : "",
            rackAddress: cv.rackAddress ? cv.rackAddress.trim() : effectiveRack,
            generateBarcode: barcodeVal,
          });
        }
      }
    } catch (cvAsinErr) {
      console.error("Failed to sync child variants to AsinImport:", cvAsinErr);
    }
  }

  await autoPersistProductOptions(userId, data);
  await syncProductInventoryService(product.id, userId);
  return updatedProduct;
};

// ======================================================
// Delete Product
// ======================================================

export const deleteProductService = async (id, userId) => {
  const product = await prisma.product.findFirst({
    where: { id, userId },
    include: { variants: true },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  // Collect all ASINs and SKUs related to this product and its variants
  const asinsToDelete = new Set();
  const skusToDelete = new Set();

  if (product.asin && product.asin.trim()) {
    asinsToDelete.add(product.asin.trim());
  }
  if (product.masterSku && product.masterSku.trim()) {
    skusToDelete.add(product.masterSku.trim());
  }

  if (product.variants && Array.isArray(product.variants)) {
    product.variants.forEach((v) => {
      if (v.asin && v.asin.trim()) {
        asinsToDelete.add(v.asin.trim());
      }
      if (v.variantSku && v.variantSku.trim()) {
        skusToDelete.add(v.variantSku.trim());
      }
    });
  }

  await deleteProduct(id, userId);

  // Delete related AsinImport records
  const orConditions = [];
  if (asinsToDelete.size > 0) {
    orConditions.push({ asin: { in: Array.from(asinsToDelete) } });
  }
  if (skusToDelete.size > 0) {
    orConditions.push({ sku: { in: Array.from(skusToDelete) } });
  }

  if (orConditions.length > 0) {
    try {
      await prisma.asinImport.deleteMany({
        where: {
          userId,
          OR: orConditions,
        },
      });
    } catch (asinErr) {
      console.error("Failed to delete AsinImport records when product deleted:", asinErr);
    }
  }

  return true;
};

// ======================================================
// Update Product Status
// ======================================================

export const updateProductStatusService = async (id, userId, isActive) => {
  console.log("SERVICE CALLED");

  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  console.log("BEFORE PRODUCT UPDATE");

  // Product Status
  await updateProductStatus(id, isActive);

  console.log("AFTER PRODUCT UPDATE");

  // All Variant Status
  await updateVariantsStatusByProduct(id, isActive);

  console.log("AFTER VARIANT UPDATE");

  return await getProductById(id, userId);
};

// ======================================================
// Get Product Stats
// ======================================================

export const getProductStatsService = async (userId) => {
  return await getProductStats(userId);
};

// ======================================================
// Import Products From Excel
// ======================================================

import * as xlsx from "xlsx";

export const importProductsFromExcelService = async (userId, fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("No file uploaded.");
  }

  // Use xlsx to safely read the file buffer
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  let worksheet = null;
  let targetSheetName = "";

  // Look for a sheet that actually has content (skip empty instruction sheets if any)
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (ws && ws["!ref"]) {
      const parsed = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (parsed.length >= 2) {
        worksheet = ws;
        targetSheetName = name;
        break;
      }
    }
  }

  if (!worksheet) {
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
  }

  if (!worksheet) {
    throw new Error("Excel sheet is empty or contains no readable sheets.");
  }

  // Parse to array of arrays
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (rows.length < 2) {
    throw new Error("No valid data rows found in the uploaded Excel file.");
  }

  // Dynamically scan the first 10 rows to find the exact header row
  let headerRowIndex = 0;
  let maxMatchedScore = 0;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const candidateRow = rows[r];
    if (!Array.isArray(candidateRow) || candidateRow.length === 0) continue;

    let score = 0;
    candidateRow.forEach((cellVal) => {
      const clean = String(cellVal || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.includes("variantsku") || clean.includes("variant") || clean === "sku") score += 3;
      if (clean.includes("asin")) score += 2;
      if (clean.includes("myntra")) score += 2;
      if (clean.includes("fsn") || clean.includes("flipkart") || clean.includes("flipcart")) score += 2;
      if (clean.includes("rack")) score += 1;
      if (clean.includes("color") || clean.includes("colour")) score += 1;
      if (clean.includes("size")) score += 1;
      if (clean.includes("gender")) score += 1;
      if (clean.includes("mastersku") || clean.includes("productname")) score += 2;
    });

    if (score > maxMatchedScore) {
      maxMatchedScore = score;
      headerRowIndex = r;
    }
  }

  const headerRow = rows[headerRowIndex];

  let colIndexVariantSku = -1;
  let colIndexAsin = -1;
  let colIndexMyntraSku = -1;
  let colIndexFsnCode = -1;
  let colIndexRack = -1;
  let colIndexColor = -1;
  let colIndexSize = -1;
  let colIndexGender = -1;
  let colIndexMasterSku = -1;
  let colIndexProductName = -1;

  headerRow.forEach((cellVal, idx) => {
    const raw = String(cellVal || "").trim().toLowerCase();
    const clean = raw.replace(/[^a-z0-9]/g, "");

    // Variant SKU column match
    if (
      clean === "variantsku" ||
      clean === "variant" ||
      clean === "productvariantsku" ||
      clean === "childsku" ||
      clean === "subsku" ||
      clean === "sellersku" ||
      clean === "itemsku" ||
      clean === "sku" ||
      clean === "skucode" ||
      clean === "skuid" ||
      (clean.includes("variant") && clean.includes("sku"))
    ) {
      if (colIndexVariantSku === -1 || clean.includes("variant")) {
        colIndexVariantSku = idx;
      }
    }

    // ASIN column match
    if (clean.includes("asin")) {
      colIndexAsin = idx;
    }

    // Myntra SKU column match
    if (clean.includes("myntra")) {
      colIndexMyntraSku = idx;
    }

    // FSN Code column match
    if (clean.includes("fsn") || clean.includes("flipkart") || clean.includes("flipcart")) {
      colIndexFsnCode = idx;
    }

    // Rack Address column match
    if (clean.includes("rack")) {
      colIndexRack = idx;
    }

    // Color column match
    if (clean.includes("color") || clean.includes("colour")) {
      colIndexColor = idx;
    }

    // Size column match
    if (clean.includes("size")) {
      colIndexSize = idx;
    }

    // Gender column match
    if (clean.includes("gender")) {
      colIndexGender = idx;
    }

    // Master SKU column match
    if (clean.includes("mastersku") || clean.includes("parentsku")) {
      colIndexMasterSku = idx;
    }

    // Product Name column match
    if (clean.includes("productname") || clean === "product" || clean === "title") {
      colIndexProductName = idx;
    }
  });

  // Collect any other dynamic attribute columns (e.g. Material, Storage, RAM, etc.)
  const dynamicAttributeCols = [];
  headerRow.forEach((cellVal, idx) => {
    if (
      idx !== colIndexVariantSku &&
      idx !== colIndexAsin &&
      idx !== colIndexMyntraSku &&
      idx !== colIndexFsnCode &&
      idx !== colIndexRack &&
      idx !== colIndexColor &&
      idx !== colIndexSize &&
      idx !== colIndexGender &&
      idx !== colIndexMasterSku &&
      idx !== colIndexProductName
    ) {
      const headerName = String(cellVal || "").trim();
      const lower = headerName.toLowerCase();
      if (
        headerName &&
        !["status", "action", "img", "image", "actions"].includes(lower)
      ) {
        dynamicAttributeCols.push({ headerName, colIndex: idx });
      }
    }
  });

  const isVariantSheet = colIndexVariantSku !== -1;
  const isLegacyProductSheet = !isVariantSheet && colIndexMasterSku !== -1;

  if (!isVariantSheet && !isLegacyProductSheet) {
    throw new Error(
      "Could not detect a SKU or Variant SKU column in the uploaded sheet. Please ensure the header row includes a 'Variant SKU' column. You can download the demo sheet for reference."
    );
  }

  const errors = [];
  const notFoundSkus = [];
  let updatedCount = 0;
  const affectedProducts = new Map();

  // --------------------------------------------------------------------------
  // BRANCH A: Variant SKU Sheet (updates every data related to that variant SKU)
  // Only existing data is updated; no new product or variant addition.
  // --------------------------------------------------------------------------
  if (isVariantSheet) {
    const dataStartRow = headerRowIndex + 1;

    for (let rowNum = dataStartRow; rowNum < rows.length; rowNum++) {
      const row = rows[rowNum];
      if (!Array.isArray(row) || row.length === 0) continue;

      const variantSkuRaw = colIndexVariantSku !== -1 ? row[colIndexVariantSku] : "";
      const variantSku = String(variantSkuRaw || "").trim();
      if (!variantSku) continue;

      const asin = colIndexAsin !== -1 ? String(row[colIndexAsin] || "").trim() : "";
      const myntraSku = colIndexMyntraSku !== -1 ? String(row[colIndexMyntraSku] || "").trim() : "";
      const fsnCode = colIndexFsnCode !== -1 ? String(row[colIndexFsnCode] || "").trim() : "";
      const rackAddress = colIndexRack !== -1 ? String(row[colIndexRack] || "").trim() : "";
      const color = colIndexColor !== -1 ? String(row[colIndexColor] || "").trim() : "";
      const size = colIndexSize !== -1 ? String(row[colIndexSize] || "").trim() : "";
      const gender = colIndexGender !== -1 ? String(row[colIndexGender] || "").trim() : "";

      try {
        // Find existing variant in DB for this user's products
        const existingVariant = await prisma.productVariant.findFirst({
          where: {
            variantSku: { equals: variantSku, mode: "insensitive" },
            product: { userId },
          },
          include: {
            product: {
              include: {
                attributes: true,
              },
            },
            attributes: {
              include: {
                productAttribute: true,
              },
            },
          },
        });

        if (!existingVariant) {
          notFoundSkus.push(variantSku);
          errors.push({
            row: rowNum + 1,
            variantSku,
            error: `Variant SKU "${variantSku}" (Row ${rowNum + 1}) was not found in the database and was skipped.`,
          });
          continue;
        }

        const product = existingVariant.product;

        // 1. Update Variant fields
        const variantUpdateData = {};
        if (asin) variantUpdateData.asin = asin;
        if (myntraSku) variantUpdateData.myntraSku = myntraSku;
        if (fsnCode) variantUpdateData.fsnCode = fsnCode;
        if (rackAddress) variantUpdateData.rackAddress = rackAddress;
        variantUpdateData.isActive = true;

        if (Object.keys(variantUpdateData).length > 0) {
          await prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: variantUpdateData,
          });
        }

        // 2. Ensure parent product has attributes (Colour, Size, Gender)
        let colorAttr = product.attributes.find((a) =>
          ["colour", "color"].includes(a.attributeName.toLowerCase().trim())
        );
        let sizeAttr = product.attributes.find((a) =>
          ["size"].includes(a.attributeName.toLowerCase().trim())
        );
        let genderAttr = product.attributes.find((a) =>
          ["gender"].includes(a.attributeName.toLowerCase().trim())
        );

        if (!colorAttr && color) {
          colorAttr = await prisma.productAttribute.create({
            data: { productId: product.id, attributeName: "Colour" },
          });
          product.attributes.push(colorAttr);
        }
        if (!sizeAttr && size) {
          sizeAttr = await prisma.productAttribute.create({
            data: { productId: product.id, attributeName: "Size" },
          });
          product.attributes.push(sizeAttr);
        }
        if (!genderAttr && gender) {
          genderAttr = await prisma.productAttribute.create({
            data: { productId: product.id, attributeName: "Gender" },
          });
          product.attributes.push(genderAttr);
        }

        // 3. Update variant attribute values
        if (color && colorAttr) {
          const hasCol = existingVariant.attributes.find(
            (a) =>
              a.productAttributeId === colorAttr.id ||
              ["colour", "color"].includes(
                a.productAttribute?.attributeName?.toLowerCase().trim() || ""
              )
          );
          if (hasCol) {
            await prisma.productVariantAttribute.update({
              where: { id: hasCol.id },
              data: { attributeValue: color },
            });
          } else {
            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: existingVariant.id,
                productAttributeId: colorAttr.id,
                attributeValue: color,
              },
            });
          }
        }

        if (size && sizeAttr) {
          const hasSz = existingVariant.attributes.find(
            (a) =>
              a.productAttributeId === sizeAttr.id ||
              ["size"].includes(
                a.productAttribute?.attributeName?.toLowerCase().trim() || ""
              )
          );
          if (hasSz) {
            await prisma.productVariantAttribute.update({
              where: { id: hasSz.id },
              data: { attributeValue: size },
            });
          } else {
            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: existingVariant.id,
                productAttributeId: sizeAttr.id,
                attributeValue: size,
              },
            });
          }
        }

        if (gender && genderAttr) {
          const hasG = existingVariant.attributes.find(
            (a) =>
              a.productAttributeId === genderAttr.id ||
              ["gender"].includes(
                a.productAttribute?.attributeName?.toLowerCase().trim() || ""
              )
          );
          if (hasG) {
            await prisma.productVariantAttribute.update({
              where: { id: hasG.id },
              data: { attributeValue: gender },
            });
          } else {
            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: existingVariant.id,
                productAttributeId: genderAttr.id,
                attributeValue: gender,
              },
            });
          }
        }

        // 4. Update any additional dynamic attribute columns (e.g. Material, Storage, etc.)
        for (const dynCol of dynamicAttributeCols) {
          const val = String(row[dynCol.colIndex] || "").trim();
          if (!val) continue;

          let pAttr = product.attributes.find(
            (a) =>
              a.attributeName.toLowerCase().trim() ===
              dynCol.headerName.toLowerCase().trim()
          );
          if (!pAttr) {
            pAttr = await prisma.productAttribute.create({
              data: {
                productId: product.id,
                attributeName: dynCol.headerName,
              },
            });
            product.attributes.push(pAttr);
          }

          const hasAttr = existingVariant.attributes.find(
            (a) =>
              a.productAttributeId === pAttr.id ||
              a.productAttribute?.attributeName?.toLowerCase().trim() ===
                dynCol.headerName.toLowerCase().trim()
          );

          if (hasAttr) {
            await prisma.productVariantAttribute.update({
              where: { id: hasAttr.id },
              data: { attributeValue: val },
            });
          } else {
            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: existingVariant.id,
                productAttributeId: pAttr.id,
                attributeValue: val,
              },
            });
          }
        }

        // 5. Update parent product summary fields
        const existingColors = Array.isArray(product.colors) ? product.colors : [];
        const updatedColors = color && !existingColors.includes(color)
          ? [...existingColors, color]
          : existingColors;

        const existingSizes = product.sizeList
          ? product.sizeList.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        const updatedSizes = size && !existingSizes.includes(size)
          ? [...existingSizes, size]
          : existingSizes;

        const productDataToUpdate = {
          colors: updatedColors,
          sizeList: updatedSizes.join(", "),
          gender: gender || product.gender || null,
          rackAddress: rackAddress || product.rackAddress || null,
          asin: asin || product.asin || null,
          myntraSku: myntraSku || product.myntraSku || null,
          fsnCode: fsnCode || product.fsnCode || null,
        };

        await prisma.product.update({
          where: { id: product.id },
          data: productDataToUpdate,
        });

        // 5. Sync ASIN to AsinImport if present
        if (asin && asin.trim()) {
          try {
            await upsertAsinImport({
              userId,
              asin: asin.trim(),
              sku: existingVariant.variantSku,
              rackAddress: rackAddress || existingVariant.rackAddress || null,
              generateBarcode: "No",
            });
          } catch (asinErr) {
            console.error("Failed to sync imported ASIN to AsinImport:", asinErr);
          }
        }

        affectedProducts.set(product.id, product);
        updatedCount++;
      } catch (rowErr) {
        errors.push({ row: rowNum + 1, variantSku, error: rowErr.message });
      }
    }

    const allProducts = Array.from(affectedProducts.values());

    let message = "";
    if (updatedCount > 0 && errors.length > 0) {
      const sampleSkus =
        notFoundSkus.slice(0, 3).join(", ") +
        (notFoundSkus.length > 3 ? ` and ${notFoundSkus.length - 3} more` : "");
      message = `Updated ${updatedCount} variant(s). ${errors.length} variant SKU(s) were not found in database and skipped: [${sampleSkus}].`;
    } else if (updatedCount > 0) {
      message = `Successfully updated ${updatedCount} variant(s) across ${allProducts.length} product(s).`;
    } else if (errors.length > 0) {
      const sampleSkus =
        notFoundSkus.slice(0, 3).join(", ") +
        (notFoundSkus.length > 3 ? ` and ${notFoundSkus.length - 3} more` : "");
      message = `0 variants updated. None of the ${errors.length} variant SKU(s) exist in database: [${sampleSkus}]. Only existing variant SKUs can be updated.`;
    } else {
      message = "No variant records were updated.";
    }

    return {
      importedCount: updatedCount,
      updatedCount,
      notFoundCount: notFoundSkus.length,
      notFoundSkus,
      products: allProducts,
      errors,
      message,
    };
  }

  // --------------------------------------------------------------------------
  // BRANCH B: Classic Product Sheet Format (Only updates existing products)
  // --------------------------------------------------------------------------
  const updatedProducts = [];
  const dataStartRow = headerRowIndex + 1;

  for (let rowNum = dataStartRow; rowNum < rows.length; rowNum++) {
    const row = rows[rowNum];
    if (!Array.isArray(row) || row.length === 0) continue;

    const masterSkuRaw = colIndexMasterSku !== -1 ? row[colIndexMasterSku] : "";
    const productNameRaw = colIndexProductName !== -1 ? row[colIndexProductName] : "";
    const masterSku = String(masterSkuRaw || productNameRaw || "").trim();

    if (!masterSku) continue;

    try {
      const existingProduct = await prisma.product.findFirst({
        where: {
          userId,
          OR: [
            { masterSku: { equals: masterSku, mode: "insensitive" } },
            { sku: { equals: masterSku, mode: "insensitive" } },
          ],
        },
      });

      if (!existingProduct) {
        errors.push({
          row: rowNum + 1,
          masterSku,
          error: `Product with SKU "${masterSku}" does not exist in database. Skipped (no new products are added).`,
        });
        continue;
      }

      const brand = colIndexVariantSku !== -1 ? "" : "";
      const updateData = {};
      if (colIndexRack !== -1 && row[colIndexRack]) updateData.rackAddress = String(row[colIndexRack]).trim();
      if (colIndexAsin !== -1 && row[colIndexAsin]) updateData.asin = String(row[colIndexAsin]).trim();
      if (colIndexMyntraSku !== -1 && row[colIndexMyntraSku]) updateData.myntraSku = String(row[colIndexMyntraSku]).trim();
      if (colIndexFsnCode !== -1 && row[colIndexFsnCode]) updateData.fsnCode = String(row[colIndexFsnCode]).trim();

      if (Object.keys(updateData).length > 0) {
        const updated = await prisma.product.update({
          where: { id: existingProduct.id },
          data: updateData,
        });
        updatedProducts.push(updated);
        updatedCount++;
      }
    } catch (err) {
      errors.push({ row: rowNum + 1, error: err.message });
    }
  }

  let message = "";
  if (updatedCount > 0 && errors.length > 0) {
    message = `Updated ${updatedCount} existing product(s). ${errors.length} row(s) were not found and skipped.`;
  } else if (updatedCount > 0) {
    message = `Successfully updated ${updatedCount} existing product(s).`;
  } else if (errors.length > 0) {
    message = `0 products updated. ${errors.length} row(s) were skipped because they do not exist in database.`;
  } else {
    message = "No records to update.";
  }

  return {
    importedCount: updatedCount,
    updatedCount,
    notFoundCount: errors.length,
    products: updatedProducts,
    errors,
    message,
  };
};



export const autoPersistProductOptions = async (userId, data) => {
  try {
    const promises = [];
    if (data.category && typeof data.category === "string" && data.category.trim()) {
      promises.push(upsertDropdownOption(userId, { field: "category", value: data.category.trim() }));
    }
    if (data.brand && typeof data.brand === "string" && data.brand.trim()) {
      promises.push(upsertDropdownOption(userId, { field: "brand", value: data.brand.trim() }));
    }
    if (data.unit && typeof data.unit === "string" && data.unit.trim()) {
      promises.push(upsertDropdownOption(userId, { field: "unit", value: data.unit.trim() }));
    }
    if (data.gender && typeof data.gender === "string" && data.gender.trim()) {
      promises.push(upsertDropdownOption(userId, { field: "gender", value: data.gender.trim() }));
    }
    if (data.referenceParty && typeof data.referenceParty === "string" && data.referenceParty.trim()) {
      promises.push(upsertDropdownOption(userId, { field: "referenceParty", value: data.referenceParty.trim() }));
    }
    if (data.rackAddress && typeof data.rackAddress === "string" && data.rackAddress.trim()) {
      promises.push(upsertDropdownOption(userId, { field: "rackAddress", value: data.rackAddress.trim() }));
    }
    if (data.availability && typeof data.availability === "string" && data.availability.trim()) {
      promises.push(upsertDropdownOption(userId, { field: "availability", value: data.availability.trim() }));
    }
    if (Array.isArray(data.colors)) {
      data.colors.forEach((col) => {
        if (col && typeof col === "string" && col.trim()) {
          promises.push(upsertDropdownOption(userId, { field: "color", value: col.trim() }));
        }
      });
    }
    await Promise.allSettled(promises);
  } catch (err) {
    console.error("Auto-persist dropdown options error:", err);
  }
};

// ======================================================
// Dropdown Options Services
// ======================================================

export const getDropdownOptionsService = async (userId) => {
  const [userSaved, parties, existingProducts, variantColorAttrs] = await Promise.all([
    getDropdownOptionsByUserId(userId),
    getPartiesByUserId(userId),
    prisma.product.findMany({
      where: { userId },
      select: {
        category: true,
        brand: true,
        unit: true,
        gender: true,
        referenceParty: true,
        rackAddress: true,
        availability: true,
        colors: true,
        gstRate: true,
      },
    }),
    prisma.productVariantAttribute.findMany({
      where: {
        productVariant: {
          product: { userId },
        },
        productAttribute: {
          attributeName: {
            in: ["Colour", "colour", "Color", "color"],
          },
        },
      },
      select: {
        attributeValue: true,
      },
    }).catch(() => []),
  ]);

  const variantColors = (variantColorAttrs || [])
    .flatMap((va) => (va.attributeValue ? va.attributeValue.split(",").map((s) => s.trim()) : []))
    .filter(Boolean);

  const productColors = existingProducts.flatMap((p) => p.colors || []).filter(Boolean);

  // Build disabled lookup set to ensure deactivated options never leak through distinct lists
  const disabledMap = new Map();
  (userSaved || []).forEach((o) => {
    if (o.isActive === false) {
      const f = o.field.toLowerCase();
      if (!disabledMap.has(f)) disabledMap.set(f, new Set());
      disabledMap.get(f).add(o.value.trim().toLowerCase());
    }
  });

  const isNotDisabled = (field, val) => {
    if (val === null || val === undefined) return false;
    const disabledSet = disabledMap.get(field.toLowerCase());
    return !disabledSet || !disabledSet.has(String(val).trim().toLowerCase());
  };

  return {
    savedOptions: userSaved,
    parties: parties.map((p) => p.partyName).filter((p) => Boolean(p) && isNotDisabled("referenceparty", p)),
    distinctFromProducts: {
      categories: [...new Set(existingProducts.map((p) => p.category).filter((c) => Boolean(c) && isNotDisabled("category", c)))],
      brands: [...new Set(existingProducts.map((p) => p.brand).filter((b) => Boolean(b) && isNotDisabled("brand", b)))],
      units: [...new Set(existingProducts.map((p) => p.unit).filter((u) => Boolean(u) && isNotDisabled("unit", u)))],
      genders: [...new Set(existingProducts.map((p) => p.gender).filter((g) => Boolean(g) && isNotDisabled("gender", g)))],
      referenceParties: [...new Set(existingProducts.map((p) => p.referenceParty).filter((r) => Boolean(r) && isNotDisabled("referenceparty", r)))],
      rackAddresses: [...new Set(existingProducts.map((p) => p.rackAddress).filter((ra) => Boolean(ra) && isNotDisabled("rackaddress", ra)))],
      availabilities: [...new Set(existingProducts.map((p) => p.availability).filter((a) => Boolean(a) && isNotDisabled("availability", a)))],
      colors: [...new Set([...productColors, ...variantColors].filter((c) => Boolean(c) && isNotDisabled("color", c)))],
      gstRates: [...new Set(existingProducts.map((p) => p.gstRate).filter((g) => g !== null && g !== undefined && isNotDisabled("gstrate", g)))],
    },
  };
};

export const saveDropdownOptionService = async (userId, data) => {
  return await upsertDropdownOption(userId, data);
};


// ======================================================
// Save Product Image to NAS
// Path: /mnt/qnap-vms/product-image/<userName>/<masterSku>/<color>.<ext>
// ======================================================

export const saveProductImageService = async ({ user, userName, masterSku, color, file }) => {
  const targetDir = await getProductImageDir(userName, masterSku);
  const ext = path.extname(file.originalname).toLowerCase() || '.png';
  const cleanColor = sanitizeFileName(color || 'default');

  // Remove previous image for this color if any
  try {
    const existing = await fs.promises.readdir(targetDir);
    for (const f of existing) {
      if (path.parse(f).name.toLowerCase() === cleanColor.toLowerCase()) {
        await fs.promises.unlink(path.join(targetDir, f)).catch(() => {});
      }
    }
  } catch (e) {}

  const fileName = `${cleanColor}${ext}`;
  const filePath = path.join(targetDir, fileName);
  await fs.promises.writeFile(filePath, file.buffer);

  const relativeImageUrl = `/api/v1/products/image?masterSku=${encodeURIComponent(masterSku)}&color=${encodeURIComponent(cleanColor)}`;

  // Track image in database
  try {
    const product = await prisma.product.findFirst({
      where: { masterSku },
      include: {
        variants: {
          include: {
            attributes: {
              include: {
                productAttribute: true,
              },
            },
          },
        },
      },
    });

    if (product) {
      // Find all variants for this product matching the color
      const matchedVariantIds = (product.variants || [])
        .filter((v) => {
          const colAttr = v.attributes?.find((a) =>
            ["colour", "color"].includes((a.productAttribute?.attributeName || "").toLowerCase().trim())
          );
          if (colAttr) {
            return colAttr.attributeValue?.toLowerCase().trim() === cleanColor.toLowerCase().trim();
          }
          return false;
        })
        .map((v) => v.id);

      const updatePayload = {
        imageUrl: relativeImageUrl,

        imgfileurl: filePath,
      };

      if (matchedVariantIds.length > 0) {
        await prisma.productVariant.updateMany({
          where: { id: { in: matchedVariantIds } },
          data: updatePayload,
        });
      } else if (product.variants?.length === 1) {
        await prisma.productVariant.updateMany({
          where: { productId: product.id },
          data: updatePayload,
        });
      }

      await prisma.product.update({
        where: { id: product.id },
        data: updatePayload,
      });
    }
  } catch (dbErr) {
    console.warn("Failed to update imageUrl in database:", dbErr.message);
  }

  return {
    masterSku,
    color: cleanColor,
    fileName,
    imageUrl: `${relativeImageUrl}&t=${Date.now()}`,
  };
};
