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
  if (data.asin) {
    const existingAsin = await findProductByAsin(data.asin, userId);

    if (existingAsin) {
      throw new Error("ASIN already exists.");
    }
  }

  validateAttributes(data.attributes);

  return await createProduct({
    ...data,
    isActive: data.isActive ?? true,
    userId,
  });
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
  if (data.asin && data.asin !== product.asin) {
    const existing = await findProductByAsin(data.asin, userId);

    if (existing) {
      throw new Error("ASIN already exists.");
    }
  }

  if (data.attributes) {
    validateAttributes(data.attributes);
  }

  await updateProduct(id, data);

  return await getProductById(id, userId);
};

// ======================================================
// Delete Product
// ======================================================

export const deleteProductService = async (id, userId) => {
  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  await deleteProduct(id, userId);

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

import ExcelJS from "exceljs";

export const importProductsFromExcelService = async (userId, fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("No file uploaded.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel sheet is empty.");
  }

  const headerRow = worksheet.getRow(1);
  const headerMap = {};

  headerRow.eachCell((cell, colNumber) => {
    const headerText = String(cell.value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    headerMap[headerText] = colNumber;
  });

  const getColValue = (row, fieldKeys) => {
    for (const key of fieldKeys) {
      const colNum = headerMap[key];
      if (colNum) {
        const val = row.getCell(colNum).value;
        if (val !== null && val !== undefined) {
          if (typeof val === "object" && val.result !== undefined) {
            return String(val.result).trim();
          }
          if (typeof val === "object" && val.text !== undefined) {
            return String(val.text).trim();
          }
          return String(val).trim();
        }
      }
    }
    return "";
  };

  const createdProducts = [];
  const errors = [];

  const totalRows = worksheet.rowCount;

  for (let rowNum = 2; rowNum <= totalRows; rowNum++) {
    const row = worksheet.getRow(rowNum);

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
        mrp: isNaN(mrp) ? null : mrp,
        hsnCode: hsnCode || null,
        gstRate: isNaN(gstRate) ? null : gstRate,
        isActive: true,
        userId,
        attributes: [],
      });

      createdProducts.push(newProduct);
    } catch (err) {
      errors.push({ row: rowNum, error: err.message });
    }
  }

  return {
    importedCount: createdProducts.length,
    products: createdProducts,
    errors,
  };
};

