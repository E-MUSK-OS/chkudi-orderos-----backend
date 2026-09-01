import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from "../validations/product.validation.js";

import {
  createProductService,
  getAllProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  updateProductStatusService,
  getProductStatsService,
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