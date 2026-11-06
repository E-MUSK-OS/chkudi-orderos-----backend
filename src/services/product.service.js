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
import { getAllMasterDropdownOptionsService, normalizeFieldKey, ensureFieldDefaultsInDb } from "./settingMasters.service.js";
import { getWorkspaceDropdownManagementMode } from "./clientConfiguration.service.js";

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
  let colIndexMasterSku = -1;
  let colIndexProductName = -1;
  let colIndexCategory = -1;
  let colIndexSubCategory = -1;
  let colIndexBrand = -1;
  let colIndexUnit = -1;
  let colIndexColor = -1;
  let colIndexSize = -1;
  let colIndexGender = -1;
  let colIndexHsnCode = -1;
  let colIndexGstRate = -1;
  let colIndexCost = -1;
  let colIndexSalesRate = -1;
  let colIndexDealerRate = -1;
  let colIndexRetailRate = -1;
  let colIndexMrp = -1;
  let colIndexOpeningStock = -1;
  let colIndexOpeningRate = -1;
  let colIndexReorderStock = -1;
  let colIndexMinStock = -1;
  let colIndexProductPoints = -1;
  let colIndexIsPaired = -1;
  let colIndexAvailability = -1;
  let colIndexCostMode = -1;
  let colIndexRack = -1;
  let colIndexAsin = -1;
  let colIndexMyntraSku = -1;
  let colIndexFsnCode = -1;
  let colIndexActive = -1;

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

    // Master SKU column match
    if (clean === "mastersku" || clean === "parentsku" || clean === "master") {
      colIndexMasterSku = idx;
    }

    // Product Name column match
    if (clean === "productname" || clean === "itemname" || clean === "product" || clean === "title" || clean === "name") {
      colIndexProductName = idx;
    }

    // Category
    if (clean === "subcategory" || clean === "subcat") {
      colIndexSubCategory = idx;
    } else if (clean === "category" || clean === "cat") {
      colIndexCategory = idx;
    }

    // Brand
    if (clean === "brand" || clean === "brandname") {
      colIndexBrand = idx;
    }

    // Unit
    if (clean === "unit" || clean === "uom") {
      colIndexUnit = idx;
    }

    // Color
    if (clean === "color" || clean === "colour") {
      colIndexColor = idx;
    }

    // Size
    if (clean === "size" || clean === "sizes" || clean === "sizelist") {
      colIndexSize = idx;
    }

    // Gender
    if (clean === "gender") {
      colIndexGender = idx;
    }

    // HSN Code
    if (clean === "hsn" || clean === "hsncode") {
      colIndexHsnCode = idx;
    }

    // GST Rate
    if (clean === "gst" || clean === "gstrate" || clean === "tax" || clean === "taxrate" || clean.startsWith("gst")) {
      colIndexGstRate = idx;
    }

    // Cost / Product Cost
    if (clean === "cost" || clean === "productcost" || clean === "purchaserate") {
      colIndexCost = idx;
    }

    // Sales Rate
    if (clean === "salesrate" || clean === "salerate" || clean === "rate" || clean === "sellingprice") {
      colIndexSalesRate = idx;
    }

    // Dealer Rate
    if (clean === "dealerrate" || clean === "dealerprice") {
      colIndexDealerRate = idx;
    }

    // Retail Rate
    if (clean === "retailrate" || clean === "retailprice") {
      colIndexRetailRate = idx;
    }

    // MRP
    if (clean === "mrp") {
      colIndexMrp = idx;
    }

    // Opening Stock
    if (clean === "openingstock" || clean === "stock" || clean === "qty" || clean === "quantity") {
      colIndexOpeningStock = idx;
    }

    // Opening Rate
    if (clean === "openingrate") {
      colIndexOpeningRate = idx;
    }

    // Re-order stock
    if (clean === "reorderlevelstock" || clean === "reorderlevel" || clean === "reorderstock" || clean === "reorder") {
      colIndexReorderStock = idx;
    }

    // Minimum stock
    if (clean === "minimumstock" || clean === "minstock") {
      colIndexMinStock = idx;
    }

    // Product Points
    if (clean === "productpoints" || clean === "productpoint" || clean === "points") {
      colIndexProductPoints = idx;
    }

    // Is Paired
    if (clean === "ispaired" || clean === "paired") {
      colIndexIsPaired = idx;
    }

    // Availability
    if (clean === "availability" || clean === "available") {
      colIndexAvailability = idx;
    }

    // Cost Applying Mode
    if (clean === "costapplyingmode" || clean === "costmode") {
      colIndexCostMode = idx;
    }

    // ASIN column match
    if (clean === "asin") {
      colIndexAsin = idx;
    }

    // Myntra SKU column match
    if (clean === "myntrasku" || clean === "myntra") {
      colIndexMyntraSku = idx;
    }

    // FSN Code column match
    if (clean === "fsncode" || clean === "fsn" || clean === "flipkart" || clean === "flipcart") {
      colIndexFsnCode = idx;
    }

    // Rack Address column match
    if (clean === "rack" || clean === "rackaddress" || clean === "racklocation") {
      colIndexRack = idx;
    }

    // Active status
    if (clean === "active" || clean === "status" || clean === "isactive") {
      colIndexActive = idx;
    }
  });

    // Track standard indices so standard columns don't pollute dynamic attributes
  const standardIndices = new Set([
    colIndexVariantSku,
    colIndexMasterSku,
    colIndexProductName,
    colIndexCategory,
    colIndexSubCategory,
    colIndexBrand,
    colIndexUnit,
    colIndexColor,
    colIndexSize,
    colIndexGender,
    colIndexHsnCode,
    colIndexGstRate,
    colIndexCost,
    colIndexSalesRate,
    colIndexDealerRate,
    colIndexRetailRate,
    colIndexMrp,
    colIndexOpeningStock,
    colIndexOpeningRate,
    colIndexReorderStock,
    colIndexMinStock,
    colIndexProductPoints,
    colIndexIsPaired,
    colIndexAvailability,
    colIndexCostMode,
    colIndexRack,
    colIndexAsin,
    colIndexMyntraSku,
    colIndexFsnCode,
    colIndexActive,
  ]);

  // Collect any other dynamic attribute columns (e.g. Material, Storage, RAM, etc.)
  const dynamicAttributeCols = [];
  headerRow.forEach((cellVal, idx) => {
    if (!standardIndices.has(idx)) {
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
  let importedCount = 0;
  let updatedCount = 0;
  const affectedProducts = new Map();

  // --------------------------------------------------------------------------
  // BRANCH A: Variant SKU Sheet (Creates new products/variants or updates existing)
  // --------------------------------------------------------------------------
  if (isVariantSheet) {
    const dataStartRow = headerRowIndex + 1;

    for (let rowNum = dataStartRow; rowNum < rows.length; rowNum++) {
      const row = rows[rowNum];
      if (!Array.isArray(row) || row.length === 0) continue;

      const variantSkuRaw = colIndexVariantSku !== -1 ? row[colIndexVariantSku] : "";
      const variantSku = String(variantSkuRaw || "").trim();
      if (!variantSku) continue;

      const masterSkuRaw = colIndexMasterSku !== -1 ? row[colIndexMasterSku] : "";
      let masterSku = String(masterSkuRaw || "").trim();
      if (!masterSku) {
        const lastDash = variantSku.lastIndexOf("-");
        masterSku = lastDash > 0 ? variantSku.slice(0, lastDash) : variantSku;
      }

      const productName = colIndexProductName !== -1 ? String(row[colIndexProductName] || "").trim() : "";
      const category = colIndexCategory !== -1 ? String(row[colIndexCategory] || "").trim() : "";
      const subCategory = colIndexSubCategory !== -1 ? String(row[colIndexSubCategory] || "").trim() : "";
      const brand = colIndexBrand !== -1 ? String(row[colIndexBrand] || "").trim() : "";
      const unit = colIndexUnit !== -1 ? String(row[colIndexUnit] || "").trim() : "";
      const color = colIndexColor !== -1 ? String(row[colIndexColor] || "").trim() : "";
      const size = colIndexSize !== -1 ? String(row[colIndexSize] || "").trim() : "";
      const gender = colIndexGender !== -1 ? String(row[colIndexGender] || "").trim() : "";
      const hsnCode = colIndexHsnCode !== -1 ? String(row[colIndexHsnCode] || "").trim() : "";
      const gstRateRaw = colIndexGstRate !== -1 ? row[colIndexGstRate] : null;
      const gstRate = gstRateRaw !== null && gstRateRaw !== "" ? parseFloat(gstRateRaw) || null : null;
      const cost = colIndexCost !== -1 ? parseFloat(row[colIndexCost]) || 0 : 0;
      const salesRate = colIndexSalesRate !== -1 ? parseFloat(row[colIndexSalesRate]) || 0 : 0;
      const dealerRate = colIndexDealerRate !== -1 ? parseFloat(row[colIndexDealerRate]) || 0 : 0;
      const retailRate = colIndexRetailRate !== -1 ? parseFloat(row[colIndexRetailRate]) || 0 : 0;
      const mrp = colIndexMrp !== -1 && row[colIndexMrp] ? String(row[colIndexMrp]).trim() : null;
      const openingStock = colIndexOpeningStock !== -1 ? parseInt(row[colIndexOpeningStock], 10) || 0 : 0;
      const openingRate = colIndexOpeningRate !== -1 ? parseFloat(row[colIndexOpeningRate]) || 0 : 0;
      const reorderStock = colIndexReorderStock !== -1 ? parseInt(row[colIndexReorderStock], 10) || 0 : 0;
      const minStock = colIndexMinStock !== -1 ? parseInt(row[colIndexMinStock], 10) || 0 : 0;
      const asin = colIndexAsin !== -1 ? String(row[colIndexAsin] || "").trim() : "";
      const myntraSku = colIndexMyntraSku !== -1 ? String(row[colIndexMyntraSku] || "").trim() : "";
      const fsnCode = colIndexFsnCode !== -1 ? String(row[colIndexFsnCode] || "").trim() : "";
      const rackAddress = colIndexRack !== -1 ? String(row[colIndexRack] || "").trim() : "";

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

        let product = null;

        if (existingVariant) {
          product = existingVariant.product;

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

          // 4. Update any dynamic attributes
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
          };
          if (category) productDataToUpdate.category = category;
          if (subCategory) productDataToUpdate.subCategory = subCategory;
          if (brand) productDataToUpdate.brand = brand;
          if (unit) productDataToUpdate.unit = unit;
          if (gender) productDataToUpdate.gender = gender;
          if (hsnCode) productDataToUpdate.hsnCode = hsnCode;
          if (gstRate !== null) productDataToUpdate.gstRate = gstRate;
          if (cost > 0) productDataToUpdate.productCost = cost;
          if (salesRate > 0) productDataToUpdate.salesRate = salesRate;
          if (dealerRate > 0) productDataToUpdate.dealerRate = dealerRate;
          if (retailRate > 0) productDataToUpdate.retailRate = retailRate;
          if (mrp) productDataToUpdate.mrp = mrp;
          if (openingStock > 0) productDataToUpdate.openingStock = openingStock;
          if (minStock > 0) productDataToUpdate.minimumStock = minStock;
          if (reorderStock > 0) productDataToUpdate.reorderLevelStock = reorderStock;
          if (rackAddress) productDataToUpdate.rackAddress = rackAddress;
          if (asin) productDataToUpdate.asin = asin;
          if (myntraSku) productDataToUpdate.myntraSku = myntraSku;
          if (fsnCode) productDataToUpdate.fsnCode = fsnCode;

          await prisma.product.update({
            where: { id: product.id },
            data: productDataToUpdate,
          });

          updatedCount++;
        } else {
          // ==================================================================
          // VARIANT DOES NOT EXIST -> CREATE NEW PRODUCT & VARIANT
          // ==================================================================
          product = await prisma.product.findFirst({
            where: {
              userId,
              OR: [
                { masterSku: { equals: masterSku, mode: "insensitive" } },
                { sku: { equals: masterSku, mode: "insensitive" } },
                ...(productName ? [{ productName: { equals: productName, mode: "insensitive" } }] : []),
              ],
            },
            include: {
              attributes: true,
            },
          });

          if (!product) {
            const finalProductName = productName || masterSku || variantSku;
            product = await prisma.product.create({
              data: {
                userId,
                productName: finalProductName,
                masterSku,
                sku: masterSku,
                category: category || "General",
                subCategory: subCategory || null,
                brand: brand || null,
                unit: unit || "Pcs",
                gender: gender || null,
                hsnCode: hsnCode || null,
                gstRate: gstRate || null,
                productCost: cost || openingRate || 0,
                salesRate: salesRate || 0,
                dealerRate: dealerRate || 0,
                retailRate: retailRate || 0,
                mrp: mrp || null,
                openingStock: openingStock || 0,
                minimumStock: minStock || 0,
                reorderLevelStock: reorderStock || 0,
                rackAddress: rackAddress || null,
                asin: asin || null,
                myntraSku: myntraSku || null,
                fsnCode: fsnCode || null,
                isActive: true,
                colors: color ? [color] : [],
                sizeList: size || null,
              },
              include: {
                attributes: true,
              },
            });
          } else {
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

            const updateFields = {
              colors: updatedColors,
              sizeList: updatedSizes.join(", "),
            };
            if (category) updateFields.category = category;
            if (subCategory) updateFields.subCategory = subCategory;
            if (brand) updateFields.brand = brand;
            if (unit) updateFields.unit = unit;
            if (gender) updateFields.gender = gender;
            if (hsnCode) updateFields.hsnCode = hsnCode;
            if (gstRate !== null) updateFields.gstRate = gstRate;
            if (cost > 0) updateFields.productCost = cost;
            if (salesRate > 0) updateFields.salesRate = salesRate;
            if (dealerRate > 0) updateFields.dealerRate = dealerRate;
            if (retailRate > 0) updateFields.retailRate = retailRate;
            if (mrp) updateFields.mrp = mrp;
            if (openingStock > 0) updateFields.openingStock = openingStock;
            if (minStock > 0) updateFields.minimumStock = minStock;
            if (reorderStock > 0) updateFields.reorderLevelStock = reorderStock;
            if (rackAddress) updateFields.rackAddress = rackAddress;
            if (asin) updateFields.asin = asin;
            if (myntraSku) updateFields.myntraSku = myntraSku;
            if (fsnCode) updateFields.fsnCode = fsnCode;

            await prisma.product.update({
              where: { id: product.id },
              data: updateFields,
            });
          }

          // Ensure product attributes (Colour, Size, Gender)
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

          // Create the new variant
          const createdVariant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              variantSku,
              asin: asin || null,
              myntraSku: myntraSku || null,
              fsnCode: fsnCode || null,
              rackAddress: rackAddress || null,
              isActive: true,
            },
          });

          // Link variant attributes
          if (color && colorAttr) {
            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: createdVariant.id,
                productAttributeId: colorAttr.id,
                attributeValue: color,
              },
            });
          }
          if (size && sizeAttr) {
            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: createdVariant.id,
                productAttributeId: sizeAttr.id,
                attributeValue: size,
              },
            });
          }
          if (gender && genderAttr) {
            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: createdVariant.id,
                productAttributeId: genderAttr.id,
                attributeValue: gender,
              },
            });
          }

          // Link dynamic attributes
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

            await prisma.productVariantAttribute.create({
              data: {
                productVariantId: createdVariant.id,
                productAttributeId: pAttr.id,
                attributeValue: val,
              },
            });
          }

          importedCount++;
        }

        // Sync ASIN to AsinImport if present
        if (asin && asin.trim()) {
          try {
            await upsertAsinImport({
              userId,
              asin: asin.trim(),
              sku: variantSku,
              rackAddress: rackAddress || null,
              generateBarcode: "No",
            });
          } catch (asinErr) {
            console.error("Failed to sync imported ASIN to AsinImport:", asinErr);
          }
        }

        // Auto persist dropdown options and sync inventory
        await autoPersistProductOptions(userId, {
          category: product.category || category,
          brand: product.brand || brand,
          unit: product.unit || unit,
          gender: product.gender || gender,
          rackAddress: rackAddress || product.rackAddress,
        });
        await syncProductInventoryService(product.id, userId);

        affectedProducts.set(product.id, product);
      } catch (rowErr) {
        errors.push({ row: rowNum + 1, variantSku, error: rowErr.message });
      }
    }

    const allProducts = Array.from(affectedProducts.values());

    let message = "";
    if (importedCount > 0 && updatedCount > 0) {
      message = `Successfully imported ${importedCount} new variant(s) and updated ${updatedCount} existing variant(s) across ${allProducts.length} product(s).`;
    } else if (importedCount > 0) {
      message = `Successfully imported ${importedCount} new variant(s) across ${allProducts.length} product(s).`;
    } else if (updatedCount > 0) {
      message = `Successfully updated ${updatedCount} variant(s) across ${allProducts.length} product(s).`;
    } else if (errors.length > 0) {
      message = `Failed to process rows: ${errors[0]?.error || "Invalid file data"}`;
    } else {
      message = "No variant records were processed.";
    }

    return {
      importedCount,
      updatedCount,
      totalProcessed: importedCount + updatedCount,
      products: allProducts,
      errors,
      message,
    };
  }

  // --------------------------------------------------------------------------
  // BRANCH B: Classic Product Sheet Format (Creates or updates products)
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

    const categoryRaw = colIndexCategory !== -1 ? row[colIndexCategory] : "";
    const brandRaw = colIndexBrand !== -1 ? row[colIndexBrand] : "";
    const unitRaw = colIndexUnit !== -1 ? row[colIndexUnit] : "";
    const rackRaw = colIndexRack !== -1 ? row[colIndexRack] : "";
    const asinRaw = colIndexAsin !== -1 ? row[colIndexAsin] : "";
    const myntraSkuRaw = colIndexMyntraSku !== -1 ? row[colIndexMyntraSku] : "";
    const fsnCodeRaw = colIndexFsnCode !== -1 ? row[colIndexFsnCode] : "";

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
        // Create new product in Branch B
        const newProduct = await prisma.product.create({
          data: {
            userId,
            productName: productNameRaw ? String(productNameRaw).trim() : masterSku,
            masterSku,
            sku: masterSku,
            category: categoryRaw ? String(categoryRaw).trim() : "General",
            brand: brandRaw ? String(brandRaw).trim() : null,
            unit: unitRaw ? String(unitRaw).trim() : "Pcs",
            rackAddress: rackRaw ? String(rackRaw).trim() : null,
            asin: asinRaw ? String(asinRaw).trim() : null,
            myntraSku: myntraSkuRaw ? String(myntraSkuRaw).trim() : null,
            fsnCode: fsnCodeRaw ? String(fsnCodeRaw).trim() : null,
            isActive: true,
          },
        });

        // Default variant
        await prisma.productVariant.create({
          data: {
            productId: newProduct.id,
            variantSku: masterSku,
            asin: newProduct.asin,
            myntraSku: newProduct.myntraSku,
            fsnCode: newProduct.fsnCode,
            rackAddress: newProduct.rackAddress,
            isActive: true,
          },
        });

        await autoPersistProductOptions(userId, newProduct);
        await syncProductInventoryService(newProduct.id, userId);

        updatedProducts.push(newProduct);
        importedCount++;
      } else {
        const updateData = {};
        if (rackRaw) updateData.rackAddress = String(rackRaw).trim();
        if (asinRaw) updateData.asin = String(asinRaw).trim();
        if (myntraSkuRaw) updateData.myntraSku = String(myntraSkuRaw).trim();
        if (fsnCodeRaw) updateData.fsnCode = String(fsnCodeRaw).trim();
        if (categoryRaw) updateData.category = String(categoryRaw).trim();
        if (brandRaw) updateData.brand = String(brandRaw).trim();
        if (unitRaw) updateData.unit = String(unitRaw).trim();

        if (Object.keys(updateData).length > 0) {
          const updated = await prisma.product.update({
            where: { id: existingProduct.id },
            data: updateData,
          });
          await autoPersistProductOptions(userId, updated);
          await syncProductInventoryService(updated.id, userId);
          updatedProducts.push(updated);
          updatedCount++;
        }
      }
    } catch (err) {
      errors.push({ row: rowNum + 1, error: err.message });
    }
  }

  let message = "";
  if (importedCount > 0 && updatedCount > 0) {
    message = `Successfully imported ${importedCount} new product(s) and updated ${updatedCount} existing product(s).`;
  } else if (importedCount > 0) {
    message = `Successfully imported ${importedCount} new product(s).`;
  } else if (updatedCount > 0) {
    message = `Successfully updated ${updatedCount} existing product(s).`;
  } else if (errors.length > 0) {
    message = `Failed to process rows: ${errors[0]?.error || "Invalid file data"}`;
  } else {
    message = "No records were processed.";
  }

  return {
    importedCount,
    updatedCount,
    totalProcessed: importedCount + updatedCount,
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

const DEFAULT_BUSINESS_TYPES = [
  "Properiter",
  "Partnership",
  "Private Limited",
  "Public Limited",
  "LLP",
  "Individual",
  "HUF",
  "Trust",
  "Society",
  "Joint Venture",
];

const DEFAULT_TRADE_CATEGORIES = [
  "Manufacturing",
  "Wholesale",
  "Retail",
  "Service",
  "E-Commerce",
  "Trader",
  "Distributor",
  "Job Worker",
];

const DEFAULT_ACCOUNT_HEADS = [
  "Sundry Debtors",
  "Sundry Creditors",
  "Employee",
  "Bank Accounts",
  "Cash-in-hand",
  "Direct Expenses",
  "Indirect Expenses",
  "Direct Incomes",
  "Indirect Incomes",
  "Capital Account",
  "Duties & Taxes",
  "Purchase Accounts",
  "Sales Accounts",
  "Loans & Advances",
  "Current Assets",
  "Current Liabilities",
  "Fixed Assets",
  "Investments",
];

const DEFAULT_DEPARTMENTS = [
  "Admin",
  "Cutting",
  "Stitching",
  "Finishing",
  "Store",
];

const DEFAULT_DESIGNATIONS = [
  "Admin",
  "Master",
  "Computer Operator",
  "Manager",
  "Supervisor",
];

const DEFAULT_SALARY_TYPES = [
  "Salaried",
  "Daily Wage",
  "Piece Rate",
  "Hourly",
];

const DEFAULT_WORKER_PROCESSES = [
  "Cutting",
  "Embroidery",
  "Stitching",
  "Ironing",
  "Packing",
  "Checking",
  "Sampling",
  "Printing",
  "Washing",
  "Finishing",
];

export const getDropdownOptionsService = async (userId) => {
  let [userSaved, parties, existingProducts, variantColorAttrs] = await Promise.all([
    getAllMasterDropdownOptionsService(userId).catch((err) => {
      console.error("Error fetching master dropdown options:", err);
      return getDropdownOptionsByUserId(userId).catch(() => []);
    }),
    getPartiesByUserId(userId).catch((err) => {
      console.error("Error fetching parties:", err);
      return [];
    }),
    prisma.product
      .findMany({
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
      })
      .catch((err) => {
        console.error("Error fetching existing products:", err);
        return [];
      }),
    prisma.productVariantAttribute
      .findMany({
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
      })
      .catch(() => []),
  ]);

  const variantColors = (variantColorAttrs || [])
    .flatMap((va) => (va.attributeValue ? va.attributeValue.split(",").map((s) => s.trim()) : []))
    .filter(Boolean);

  const productColors = (existingProducts || []).flatMap((p) => p.colors || []).filter(Boolean);

  // Build disabled lookup set to ensure deactivated options never leak through distinct lists
  const disabledMap = new Map();
  (userSaved || []).forEach((o) => {
    if (o.isActive === false || o.label === "__DELETED__") {
      const f = o.field.toLowerCase();
      if (!disabledMap.has(f)) disabledMap.set(f, new Set());
      if (o.value) disabledMap.get(f).add(o.value.trim().toLowerCase());
      if (o.label && o.label !== "__DELETED__") disabledMap.get(f).add(o.label.trim().toLowerCase());
    }
  });

  const isNotDisabled = (field, val) => {
    if (val === null || val === undefined) return false;
    const disabledSet = disabledMap.get(field.toLowerCase());
    return !disabledSet || !disabledSet.has(String(val).trim().toLowerCase());
  };

  // Auto-seed default business types, trade categories, account heads & employee fields into DB if user doesn't have them yet
  const defaultsToCheck = [
    { field: "businesstype", list: DEFAULT_BUSINESS_TYPES },
    { field: "tradecategory", list: DEFAULT_TRADE_CATEGORIES },
    { field: "accounthead", list: DEFAULT_ACCOUNT_HEADS },
    { field: "department", list: DEFAULT_DEPARTMENTS },
    { field: "designation", list: DEFAULT_DESIGNATIONS },
    { field: "salarytype", list: DEFAULT_SALARY_TYPES },
    { field: "workerprocess", list: DEFAULT_WORKER_PROCESSES },
  ];

  const toInsert = [];
  for (const item of defaultsToCheck) {
    const hasField = userSaved.some((o) => o.field.toLowerCase() === item.field);
    if (!hasField) {
      for (const val of item.list) {
        toInsert.push({ userId, field: item.field, value: val, label: val });
      }
    }
  }

  if (toInsert.length > 0) {
    await prisma.dropdownOption.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
    userSaved = await getDropdownOptionsByUserId(userId);
  }

  return {
    savedOptions: userSaved.filter(
      (o) => !(o.field.toLowerCase() === "gender" && ["male", "female"].includes(String(o.value).trim().toLowerCase()))
    ),
    parties: parties.map((p) => p.partyName).filter((p) => Boolean(p) && isNotDisabled("referenceparty", p)),
    distinctFromProducts: {
      categories: [...new Set(existingProducts.map((p) => p.category).filter((c) => Boolean(c) && isNotDisabled("category", c)))],
      brands: [...new Set(existingProducts.map((p) => p.brand).filter((b) => Boolean(b) && isNotDisabled("brand", b)))],
      units: [...new Set(existingProducts.map((p) => p.unit).filter((u) => Boolean(u) && isNotDisabled("unit", u)))],
      genders: [
        ...new Set(
          existingProducts
            .map((p) => p.gender)
            .filter((g) => Boolean(g) && isNotDisabled("gender", g) && !["male", "female"].includes(g.toLowerCase()))
        ),
      ],
      referenceParties: [...new Set(existingProducts.map((p) => p.referenceParty).filter((r) => Boolean(r) && isNotDisabled("referenceparty", r)))],
      rackAddresses: [...new Set(existingProducts.map((p) => p.rackAddress).filter((ra) => Boolean(ra) && isNotDisabled("rackaddress", ra)))],
      availabilities: [...new Set(existingProducts.map((p) => p.availability).filter((a) => Boolean(a) && isNotDisabled("availability", a)))],
      colors: [...new Set([...productColors, ...variantColors].filter((c) => Boolean(c) && isNotDisabled("color", c)))],
      gstRates: [...new Set(existingProducts.map((p) => p.gstRate).filter((g) => g !== null && g !== undefined && isNotDisabled("gstrate", g)))],
    },
  };
};

export const saveDropdownOptionService = async (userId, data) => {
  const rawField = data?.field ? String(data.field).trim().toLowerCase() : "";
  let targetField = rawField;
  if (rawField === "productcategory" || rawField === "category") {
    targetField = "category";
  } else if (rawField === "productsubcategory" || rawField === "subcategory") {
    targetField = "subcategory";
  } else if (rawField === "colour" || rawField === "colours") {
    targetField = "color";
  } else {
    targetField = normalizeFieldKey(rawField);
  }
  if (targetField) {
    await ensureFieldDefaultsInDb(userId, targetField);
  }
  return await upsertDropdownOption(userId, { ...data, field: targetField });
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
        await fs.promises.unlink(path.join(targetDir, f)).catch(() => { });
      }
    }
  } catch (e) { }

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
