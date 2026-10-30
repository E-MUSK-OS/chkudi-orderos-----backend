import prisma from '../config/prisma.js';
import fs from 'fs';
import path from 'path';
import { findProductImageFile, findAllProductImagesForSku } from '../utils/productImagePath.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  createDropdownOptionSchema,
} from "../validations/product.validation.js";

import {
  createProductService,
  getAllProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  updateProductStatusService,
  getProductStatsService,
  importProductsFromExcelService,
  getDropdownOptionsService,
  saveDropdownOptionService,
  saveProductImageService,
} from "../services/product.service.js";

// ======================================================
// Create Product
// ======================================================

export const createProduct = async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);

    const product = await createProductService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Products
// ======================================================

export const getAllProducts = async (req, res, next) => {
  try {
    const products = await getAllProductsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Product By Id
// ======================================================

export const getProductById = async (req, res, next) => {
  try {
    const product = await getProductByIdService(
      req.params.id,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Product
// ======================================================

export const updateProduct = async (req, res, next) => {
  try {
    const data = updateProductSchema.parse(req.body);

    const product = await updateProductService(
      req.params.id,
      req.user.id,
      data,
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Product
// ======================================================

export const deleteProduct = async (req, res, next) => {
  try {
    await deleteProductService(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Product Status
// ======================================================

export const updateProductStatus = async (req, res, next) => {
  try {
    const { isActive } = updateProductStatusSchema.parse(req.body);

    const product = await updateProductStatusService(
      req.params.id,
      req.user.id,
      isActive,
    );

    return res.status(200).json({
      success: true,
      message: `Product ${
        isActive ? "activated" : "deactivated"
      } successfully.`,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Product Stats
// ======================================================

export const getProductStats = async (req, res, next) => {
  try {
    const stats = await getProductStatsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Import Products From Excel
// ======================================================

export const importProductsFromExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file (.xlsx or .xls).",
      });
    }

    const result = await importProductsFromExcelService(
      req.user.id,
      req.file.buffer,
    );

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${result.importedCount} products.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// Get Dropdown Options
// ======================================================

export const getDropdownOptions = async (req, res, next) => {
  try {
    const options = await getDropdownOptionsService(req.user.id);
    return res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Save Dropdown Option
// ======================================================

export const saveDropdownOption = async (req, res, next) => {
  try {
    const data = createDropdownOptionSchema.parse(req.body);
    const option = await saveDropdownOptionService(req.user.id, data);
    return res.status(201).json({
      success: true,
      message: "Option saved successfully.",
      data: option,
    });
  } catch (error) {
    next(error);
  }
};


// ======================================================
// Upload Product Image to NAS
// ======================================================

export const uploadProductImage = async (req, res, next) => {
  try {
    const file = req.file || (req.files?.image && req.files.image[0]) || (req.files?.file && req.files.file[0]);
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Please upload an image.",
      });
    }

    const { masterSku, color } = req.body;
    if (!masterSku) {
      return res.status(400).json({
        success: false,
        message: "masterSku is required for uploading product image.",
      });
    }

    const userName = req.user?.username || req.user?.fullName || "default";
    const result = await saveProductImageService({
      user: req.user,
      userName,
      masterSku,
      color: color || "default",
      file,
    });

    return res.status(200).json({
      success: true,
      message: "Product image uploaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Stream Product Image from NAS
// ======================================================

export const streamProductImage = async (req, res, next) => {
  try {
    const { masterSku, color, userName, id } = req.query;
    let filePath = null;

    // 1. Direct ID lookup in database if provided
    if (id) {
      const variant = await prisma.productVariant.findUnique({
        where: { id },
        select: { imgfileurl: true },
      });
      if (variant?.imgfileurl && fs.existsSync(variant.imgfileurl)) {
        filePath = variant.imgfileurl;
      }
    }

    // 2. Database lookup by masterSku and color
    if (!filePath && masterSku && color) {
      const product = await prisma.product.findFirst({
        where: { masterSku },
        include: {
          variants: {
            include: {
              attributes: {
                include: { productAttribute: true },
              },
            },
          },
        },
      });

      if (product) {
        const cleanColor = String(color).trim().toLowerCase();
        const matchedVariant = (product.variants || []).find((v) => {
          const colAttr = v.attributes?.find((a) =>
            ["colour", "color"].includes((a.productAttribute?.attributeName || "").toLowerCase().trim())
          );
          return colAttr && colAttr.attributeValue?.toLowerCase().trim() === cleanColor;
        });

        if (matchedVariant?.imgfileurl && fs.existsSync(matchedVariant.imgfileurl)) {
          filePath = matchedVariant.imgfileurl;
        } else if (product.imgfileurl && fs.existsSync(product.imgfileurl)) {
          filePath = product.imgfileurl;
        }
      }
    }

    // 3. Fallback to scanning disk via findProductImageFile
    if (!filePath && masterSku && color) {
      filePath = await findProductImageFile(masterSku, color, userName);
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send("Image not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".avif": "image/avif",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    });

    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Product Images for SKU
// ======================================================

export const getProductImages = async (req, res, next) => {
  try {
    const { masterSku } = req.query;
    if (!masterSku) {
      return res.status(400).json({
        success: false,
        message: "masterSku is required",
      });
    }

    const images = await findAllProductImagesForSku(masterSku);
    const result = {};
    for (const [colorName, item] of Object.entries(images)) {
      result[colorName] = `/api/v1/products/image?masterSku=${encodeURIComponent(masterSku)}&color=${encodeURIComponent(colorName)}`;
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
