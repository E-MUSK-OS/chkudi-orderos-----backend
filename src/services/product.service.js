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
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("Excel sheet is empty.");
  }

  // Parse to array of arrays
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (rows.length < 2) {
    throw new Error("No valid product data found in Excel file.");
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

  const hasProductName =
    headerMap["productname"] !== undefined ||
    headerMap["product"] !== undefined ||
    headerMap["title"] !== undefined;
  const hasMasterSku =
    headerMap["mastersku"] !== undefined ||
    headerMap["sku"] !== undefined ||
    headerMap["masterskucode"] !== undefined;
  const hasVariantSku =
    headerMap["variantsku"] !== undefined ||
    (headerMap["sku"] !== undefined &&
      (headerMap["color"] !== undefined ||
        headerMap["colour"] !== undefined ||
        headerMap["size"] !== undefined ||
        headerMap["gender"] !== undefined));
  const isMyntraSheet =
    headerMap["myntrasku"] !== undefined ||
    headerMap["myntraskucode"] !== undefined;

  const isVariantSheet = hasVariantSku && !isMyntraSheet;
  const isLegacyProductSheet = hasProductName && hasMasterSku && !isMyntraSheet;

  if (!isVariantSheet && !isLegacyProductSheet) {
    throw new Error(
      "Please upload the appropriate sheet format for Product Import! You can download the demo sheet for reference."
    );
  }

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

  const createdProducts = [];
  const errors = [];

  // --------------------------------------------------------------------------
  // BRANCH A: Variant SKU Sheet Format (matches exported / new demo sheet)
  // --------------------------------------------------------------------------
  if (isVariantSheet && !isLegacyProductSheet) {
    const affectedProducts = new Map();

    // Cache candidate existing products for user to help common SKU prefix matching
    const existingProductsList = await prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        masterSku: true,
        sku: true,
        productName: true,
      },
    });

    const nonMatchingGroups = new Map();

    for (let rowNum = 1; rowNum < rows.length; rowNum++) {
      const row = rows[rowNum];
      const variantSku = String(getColValue(row, ["variantsku", "sku", "mastersku"]) || "").trim();
      if (!variantSku) continue;

      const asin = getColValue(row, ["asin"]);
      const rackAddress = getColValue(row, ["rackaddress", "rack", "racklocation"]);
      const color = getColValue(row, ["color", "colour"]);
      const size = getColValue(row, ["size"]);
      const gender = getColValue(row, ["gender"]);
      const explicitMasterSku = getColValue(row, ["mastersku", "base_sku", "productsku"]);

      try {
        // Step 1: Check in our DB for variant SKU
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

        // Step 2: If both matches, update that variant SKU all details
        if (existingVariant) {
          const product = existingVariant.product;

          // Check if color or size changed compared to existing variant attributes
          const existingColorVal = existingVariant.attributes?.find((a) =>
            ["colour", "color"].includes(a.productAttribute?.attributeName?.toLowerCase().trim() || "")
          )?.attributeValue;
          const existingSizeVal = existingVariant.attributes?.find((a) =>
            ["size"].includes(a.productAttribute?.attributeName?.toLowerCase().trim() || "")
          )?.attributeValue;

          const effectiveColor = color || existingColorVal || "";
          const effectiveSize = size || existingSizeVal || "";

          const isColorChanged = Boolean(
            color && existingColorVal && color.toLowerCase().trim() !== existingColorVal.toLowerCase().trim()
          );
          const isSizeChanged = Boolean(
            size && existingSizeVal && size.toLowerCase().trim() !== existingSizeVal.toLowerCase().trim()
          );

          let targetSku = existingVariant.variantSku;

          // If color or size changed, update variant SKU according to new color and size
          if (isColorChanged || isSizeChanged || (color && !existingColorVal) || (size && !existingSizeVal)) {
            let baseSku = product.masterSku || product.sku;

            if (existingColorVal && existingSizeVal) {
              const s1 = `-${existingColorVal}-${existingSizeVal}`.toLowerCase();
              const s2 = `_${existingColorVal}_${existingSizeVal}`.toLowerCase();
              if (existingVariant.variantSku.toLowerCase().endsWith(s1)) {
                baseSku = existingVariant.variantSku.slice(0, -s1.length);
              } else if (existingVariant.variantSku.toLowerCase().endsWith(s2)) {
                baseSku = existingVariant.variantSku.slice(0, -s2.length);
              }
            } else if (existingSizeVal) {
              const s1 = `-${existingSizeVal}`.toLowerCase();
              if (existingVariant.variantSku.toLowerCase().endsWith(s1)) {
                baseSku = existingVariant.variantSku.slice(0, -s1.length);
              }
            } else if (existingColorVal) {
              const s1 = `-${existingColorVal}`.toLowerCase();
              if (existingVariant.variantSku.toLowerCase().endsWith(s1)) {
                baseSku = existingVariant.variantSku.slice(0, -s1.length);
              }
            }

            if (!baseSku) {
              baseSku = product.masterSku || product.sku || existingVariant.variantSku;
            }

            const skuParts = [];
            if (effectiveColor) skuParts.push(effectiveColor);
            if (effectiveSize) skuParts.push(effectiveSize);

            targetSku = skuParts.length > 0 ? `${baseSku}-${skuParts.join("-")}` : baseSku;

            // Ensure no duplicate variantSku collision within the same product
            const duplicateVariant = await prisma.productVariant.findFirst({
              where: {
                productId: product.id,
                variantSku: { equals: targetSku, mode: "insensitive" },
                id: { not: existingVariant.id },
              },
            });

            if (duplicateVariant) {
              let counter = 1;
              let candidate = `${targetSku}-${counter}`;
              while (
                await prisma.productVariant.findFirst({
                  where: {
                    productId: product.id,
                    variantSku: { equals: candidate, mode: "insensitive" },
                    id: { not: existingVariant.id },
                  },
                })
              ) {
                counter++;
                candidate = `${targetSku}-${counter}`;
              }
              targetSku = candidate;
            }
          }

          // Update variant fields (including variantSku if changed by color/size)
          await prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              variantSku: targetSku,
              asin: asin || existingVariant.asin,
              rackAddress: rackAddress || existingVariant.rackAddress,
              isActive: true,
            },
          });

          // If variantSku changed, sync AsinImport references for the old SKU
          if (targetSku !== existingVariant.variantSku) {
            try {
              await prisma.asinImport.updateMany({
                where: {
                  userId,
                  sku: existingVariant.variantSku,
                },
                data: {
                  sku: targetSku,
                },
              });
            } catch (syncErr) {
              console.error("Failed to update sku in AsinImport:", syncErr);
            }
          }

          // Ensure Colour, Size, Gender attribute records exist on parent product
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

          // Link/update variant attributes
          if (color && colorAttr) {
            const hasCol = existingVariant.attributes.find(
              (a) => a.productAttributeId === colorAttr.id
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
              (a) => a.productAttributeId === sizeAttr.id
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
              (a) => a.productAttributeId === genderAttr.id
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

          // Update parent product colors & sizeList
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

          await prisma.product.update({
            where: { id: product.id },
            data: {
              colors: updatedColors,
              sizeList: updatedSizes.join(", "),
              gender: product.gender || gender || null,
              rackAddress: product.rackAddress || rackAddress || null,
              asin: product.asin || asin || null,
            },
          });

          // Sync ASIN to AsinImport
          if (asin && asin.trim()) {
            try {
              await upsertAsinImport({
                userId,
                asin: asin.trim(),
                sku: targetSku,
                rackAddress: rackAddress || existingVariant.rackAddress || null,
                generateBarcode: "No",
              });
            } catch (asinErr) {
              console.error("Failed to sync imported ASIN to AsinImport:", asinErr);
            }
          }

          affectedProducts.set(product.id, product);
          continue;
        }

        // Step 3: If not matching, identify variant SKU common things (its base SKU / master SKU)
        let commonSku = "";
        if (explicitMasterSku && explicitMasterSku.toLowerCase() !== variantSku.toLowerCase()) {
          commonSku = explicitMasterSku;
        }

        if (!commonSku) {
          if (
            color &&
            size &&
            variantSku.toLowerCase().endsWith(`-${color.toLowerCase()}-${size.toLowerCase()}`)
          ) {
            commonSku = variantSku.slice(0, -(color.length + size.length + 2));
          } else if (
            color &&
            size &&
            variantSku.toLowerCase().endsWith(`_${color.toLowerCase()}_${size.toLowerCase()}`)
          ) {
            commonSku = variantSku.slice(0, -(color.length + size.length + 2));
          } else if (size && variantSku.toLowerCase().endsWith(`-${size.toLowerCase()}`)) {
            commonSku = variantSku.slice(0, -(size.length + 1));
          } else if (color && variantSku.toLowerCase().endsWith(`-${color.toLowerCase()}`)) {
            commonSku = variantSku.slice(0, -(color.length + 1));
          } else if (size && variantSku.toLowerCase().endsWith(`_${size.toLowerCase()}`)) {
            commonSku = variantSku.slice(0, -(size.length + 1));
          } else if (color && variantSku.toLowerCase().endsWith(`_${color.toLowerCase()}`)) {
            commonSku = variantSku.slice(0, -(color.length + 1));
          }
        }

        if (!commonSku) {
          const vLower = variantSku.toLowerCase();
          for (const ep of existingProductsList) {
            const mSku = (ep.masterSku || "").toLowerCase();
            const bSku = (ep.sku || "").toLowerCase();
            if (mSku && (vLower.startsWith(mSku + "-") || vLower.startsWith(mSku + "_"))) {
              commonSku = ep.masterSku;
              break;
            }
            if (bSku && (vLower.startsWith(bSku + "-") || vLower.startsWith(bSku + "_"))) {
              commonSku = ep.sku;
              break;
            }
          }
        }

        if (!commonSku) {
          if (variantSku.includes("-")) {
            const parts = variantSku.split("-");
            if (parts.length > 2) {
              commonSku = parts.slice(0, -1).join("-");
            } else {
              commonSku = parts[0];
            }
          } else if (variantSku.includes("_")) {
            const parts = variantSku.split("_");
            if (parts.length > 2) {
              commonSku = parts.slice(0, -1).join("_");
            } else {
              commonSku = parts[0];
            }
          } else {
            commonSku = variantSku;
          }
        }

        if (!nonMatchingGroups.has(commonSku)) {
          nonMatchingGroups.set(commonSku, {
            commonSku,
            rows: [],
          });
        }

        nonMatchingGroups.get(commonSku).rows.push({
          rowNum,
          variantSku,
          asin,
          rackAddress,
          color,
          size,
          gender,
        });
      } catch (rowErr) {
        errors.push({ row: rowNum, variantSku, error: rowErr.message });
      }
    }

    // Process non-matching groups: auto-fetch master SKU and other details or create new product
    for (const [commonSku, group] of nonMatchingGroups.entries()) {
      try {
        const uniqueColors = Array.from(
          new Set(group.rows.map((r) => r.color).filter(Boolean))
        );
        const uniqueSizes = Array.from(
          new Set(group.rows.map((r) => r.size).filter(Boolean))
        );
        const groupGender = group.rows.find((r) => r.gender)?.gender || "";
        const groupRack = group.rows.find((r) => r.rackAddress)?.rackAddress || "";
        const groupAsin = group.rows.find((r) => r.asin)?.asin || "";

        // Check if product with this common SKU exists in DB
        let product = await prisma.product.findFirst({
          where: {
            userId,
            OR: [
              { masterSku: { equals: commonSku, mode: "insensitive" } },
              { sku: { equals: commonSku, mode: "insensitive" } },
            ],
          },
          include: {
            attributes: true,
            variants: true,
          },
        });

        if (product) {
          // Auto-fetch existing master product details and update colors & sizes
          const existingColors = Array.isArray(product.colors) ? product.colors : [];
          const mergedColors = Array.from(new Set([...existingColors, ...uniqueColors]));
          const existingSizes = product.sizeList
            ? product.sizeList.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          const mergedSizes = Array.from(new Set([...existingSizes, ...uniqueSizes]));

          await prisma.product.update({
            where: { id: product.id },
            data: {
              colors: mergedColors,
              sizeList: mergedSizes.join(", "),
              gender: product.gender || groupGender || null,
              rackAddress: product.rackAddress || groupRack || null,
              asin: product.asin || groupAsin || null,
            },
          });

          product = await prisma.product.findUnique({
            where: { id: product.id },
            include: {
              attributes: true,
              variants: true,
            },
          });
        } else {
          // Create new product with this common SKU containing variant details
          const initialAttrs = [];
          if (uniqueColors.length > 0) initialAttrs.push({ attributeName: "Colour" });
          if (uniqueSizes.length > 0) initialAttrs.push({ attributeName: "Size" });
          if (groupGender) initialAttrs.push({ attributeName: "Gender" });

          let candidateProductName = commonSku;
          const existingWithName = await prisma.product.findFirst({
            where: { userId, productName: candidateProductName },
          });
          if (existingWithName) {
            candidateProductName = `${commonSku}-${Date.now().toString().slice(-4)}`;
          }

          const created = await createProduct({
            productName: candidateProductName,
            masterSku: commonSku,
            sku: commonSku,
            brand: "No Brand",
            category: "General",
            gender: groupGender || null,
            rackAddress: groupRack || null,
            asin: groupAsin || null,
            generateBarcode: "No",
            colors: uniqueColors,
            sizeList: uniqueSizes.join(", "),
            isActive: true,
            userId,
            attributes: initialAttrs,
          });

          product = await prisma.product.findUnique({
            where: { id: created.id },
            include: {
              attributes: true,
              variants: true,
            },
          });

          existingProductsList.push({
            id: product.id,
            masterSku: product.masterSku,
            sku: product.sku,
            productName: product.productName,
          });
        }

        // Ensure Colour, Size, Gender attribute records exist in ProductAttribute
        let colorAttr = product.attributes.find((a) =>
          ["colour", "color"].includes(a.attributeName.toLowerCase().trim())
        );
        let sizeAttr = product.attributes.find((a) =>
          ["size"].includes(a.attributeName.toLowerCase().trim())
        );
        let genderAttr = product.attributes.find((a) =>
          ["gender"].includes(a.attributeName.toLowerCase().trim())
        );

        if (!colorAttr && uniqueColors.length > 0) {
          colorAttr = await prisma.productAttribute.create({
            data: { productId: product.id, attributeName: "Colour" },
          });
          product.attributes.push(colorAttr);
        }
        if (!sizeAttr && uniqueSizes.length > 0) {
          sizeAttr = await prisma.productAttribute.create({
            data: { productId: product.id, attributeName: "Size" },
          });
          product.attributes.push(sizeAttr);
        }
        if (!genderAttr && groupGender) {
          genderAttr = await prisma.productAttribute.create({
            data: { productId: product.id, attributeName: "Gender" },
          });
          product.attributes.push(genderAttr);
        }

        // Upsert each variant for this product
        for (const varRow of group.rows) {
          let effectiveVariantSku = varRow.variantSku;
          const skuParts = [];
          if (varRow.color) skuParts.push(varRow.color);
          if (varRow.size) skuParts.push(varRow.size);

          if (skuParts.length > 0) {
            const expectedSuffix = skuParts.join("-").toLowerCase();
            if (
              effectiveVariantSku.toLowerCase() === commonSku.toLowerCase() ||
              !effectiveVariantSku.toLowerCase().endsWith(expectedSuffix)
            ) {
              effectiveVariantSku = `${commonSku}-${skuParts.join("-")}`;
            }
          }

          let variant = await prisma.productVariant.findFirst({
            where: {
              productId: product.id,
              variantSku: { equals: effectiveVariantSku, mode: "insensitive" },
            },
            include: { attributes: true },
          });

          if (!variant) {
            variant = await prisma.productVariant.create({
              data: {
                productId: product.id,
                variantSku: effectiveVariantSku,
                asin: varRow.asin || null,
                rackAddress: varRow.rackAddress || null,
                isActive: true,
              },
            });
          } else {
            variant = await prisma.productVariant.update({
              where: { id: variant.id },
              data: {
                asin: varRow.asin || variant.asin,
                rackAddress: varRow.rackAddress || variant.rackAddress,
                isActive: true,
              },
            });
          }

          // Link variant attributes
          if (varRow.color && colorAttr) {
            const hasCol = await prisma.productVariantAttribute.findFirst({
              where: { productVariantId: variant.id, productAttributeId: colorAttr.id },
            });
            if (hasCol) {
              await prisma.productVariantAttribute.update({
                where: { id: hasCol.id },
                data: { attributeValue: varRow.color },
              });
            } else {
              await prisma.productVariantAttribute.create({
                data: {
                  productVariantId: variant.id,
                  productAttributeId: colorAttr.id,
                  attributeValue: varRow.color,
                },
              });
            }
          }

          if (varRow.size && sizeAttr) {
            const hasSz = await prisma.productVariantAttribute.findFirst({
              where: { productVariantId: variant.id, productAttributeId: sizeAttr.id },
            });
            if (hasSz) {
              await prisma.productVariantAttribute.update({
                where: { id: hasSz.id },
                data: { attributeValue: varRow.size },
              });
            } else {
              await prisma.productVariantAttribute.create({
                data: {
                  productVariantId: variant.id,
                  productAttributeId: sizeAttr.id,
                  attributeValue: varRow.size,
                },
              });
            }
          }

          if (varRow.gender && genderAttr) {
            const hasG = await prisma.productVariantAttribute.findFirst({
              where: { productVariantId: variant.id, productAttributeId: genderAttr.id },
            });
            if (hasG) {
              await prisma.productVariantAttribute.update({
                where: { id: hasG.id },
                data: { attributeValue: varRow.gender },
              });
            } else {
              await prisma.productVariantAttribute.create({
                data: {
                  productVariantId: variant.id,
                  productAttributeId: genderAttr.id,
                  attributeValue: varRow.gender,
                },
              });
            }
          }

          if (varRow.asin && varRow.asin.trim()) {
            try {
              await upsertAsinImport({
                userId,
                asin: varRow.asin.trim(),
                sku: effectiveVariantSku,
                rackAddress: varRow.rackAddress || null,
                generateBarcode: "No",
              });
            } catch (asinErr) {
              console.error("Failed to sync imported ASIN to AsinImport:", asinErr);
            }
          }
        }

        affectedProducts.set(product.id, product);
      } catch (grpErr) {
        errors.push({ masterSku: commonSku, error: grpErr.message });
      }
    }

    const allProducts = Array.from(affectedProducts.values());
    return {
      importedCount: allProducts.length,
      products: allProducts,
      errors,
    };
  }

  // --------------------------------------------------------------------------
  // BRANCH B: Classic Product Sheet Format (Product Name, Master SKU, ...)
  // --------------------------------------------------------------------------

  for (let rowNum = 1; rowNum < rows.length; rowNum++) {
    const row = rows[rowNum];

    const productName = getColValue(row, ["productname", "product", "title", "name"]);
    const masterSku = getColValue(row, ["mastersku", "sku", "masterskucode"]);

    if (!productName && !masterSku) {
      continue; // skip empty rows
    }

    const brand = getColValue(row, ["brand", "brandname"]) || "Generic";
    const category = getColValue(row, ["category", "categoryname"]) || "General";
    const subCategory = getColValue(row, ["subcategory", "subcategoryname"]) || "";
    const description = getColValue(row, ["description", "desc"]) || "";
    const asin = getColValue(row, ["asin"]) || "";
    const rackAddress = getColValue(row, ["rackaddress", "rack", "racklocation"]) || "";
    
    const mrpRaw = getColValue(row, ["mrp", "price"]);
    const mrp = mrpRaw ? parseFloat(String(mrpRaw).replace(/[\s,]/g, "")) : undefined;

    const hsnCode = getColValue(row, ["hsncode", "hsn"]) || "";

    const gstRaw = getColValue(row, ["gstrate", "gstpercent", "gst", "gst"]);
    const gstRate = gstRaw ? parseFloat(gstRaw.replace("%", "")) : undefined;

    const generateBarcodeRaw = getColValue(row, ["generatebarcode", "genratebarcode", "barcode", "generate_barcode"]);
    const isGenYes = generateBarcodeRaw && ["yes", "y", "true", "1"].includes(generateBarcodeRaw.toLowerCase());
    const generateBarcode = isGenYes ? "Yes" : "No";

    const finalProductName = productName || `Product ${masterSku}`;
    const finalMasterSku = masterSku || `SKU-${Date.now()}-${rowNum}`;

    try {
      // Check duplicate ASIN
      if (asin) {
        const existingAsin = await findProductByAsin(asin, userId);
        if (existingAsin) {
          continue;
        }
      }

      const newProduct = await createProduct({
        productName: finalProductName,
        masterSku: finalMasterSku,
        brand,
        category,
        subCategory: subCategory || null,
        description: description || null,
        asin: asin || null,
        rackAddress: rackAddress || null,
        generateBarcode,
        mrp: isNaN(mrp) ? null : mrp,
        hsnCode: hsnCode || null,
        gstRate: isNaN(gstRate) ? null : gstRate,
        isActive: true,
        userId,
        attributes: [],
      });

      createdProducts.push(newProduct);

      if (asin && asin.trim()) {
        try {
          await upsertAsinImport({
            userId,
            asin: asin.trim(),
            sku: finalMasterSku,
            rackAddress: rackAddress || null,
            generateBarcode,
          });
        } catch (asinErr) {
          console.error("Failed to sync imported ASIN to AsinImport:", asinErr);
        }
      }
    } catch (err) {
      errors.push({ row: rowNum + 1, error: err.message });
    }
  }

  return {
    importedCount: createdProducts.length,
    products: createdProducts,
    errors,
  };
};



// ======================================================
// Auto Persist Dropdown Options Helper
// ======================================================

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

  return {
    savedOptions: userSaved,
    parties: parties.map((p) => p.partyName).filter(Boolean),
    distinctFromProducts: {
      categories: [...new Set(existingProducts.map((p) => p.category).filter(Boolean))],
      brands: [...new Set(existingProducts.map((p) => p.brand).filter(Boolean))],
      units: [...new Set(existingProducts.map((p) => p.unit).filter(Boolean))],
      genders: [...new Set(existingProducts.map((p) => p.gender).filter(Boolean))],
      referenceParties: [...new Set(existingProducts.map((p) => p.referenceParty).filter(Boolean))],
      rackAddresses: [...new Set(existingProducts.map((p) => p.rackAddress).filter(Boolean))],
      availabilities: [...new Set(existingProducts.map((p) => p.availability).filter(Boolean))],
      colors: [...new Set([...productColors, ...variantColors])],
      gstRates: [...new Set(existingProducts.map((p) => p.gstRate).filter((g) => g !== null && g !== undefined))],
    },
  };
};

export const saveDropdownOptionService = async (userId, data) => {
  return await upsertDropdownOption(userId, data);
};


// ======================================================
// Save Product Image to NAS
// Path: NAS / VMS / Product Img / <userName> / <masterSku> / <color>.<ext>
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
