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
    const mrp = mrpRaw ? parseFloat(mrpRaw) : undefined;

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

