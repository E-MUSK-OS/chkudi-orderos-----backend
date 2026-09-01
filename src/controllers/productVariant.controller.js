import {
  createProductVariantSchema,
  updateProductVariantSchema,
  updateProductVariantStatusSchema,
} from "../validations/productVariant.validation.js";

import {
  createProductVariantService,
  getAllProductVariantsService,
  getProductVariantByIdService,
  updateProductVariantService,
  deleteProductVariantService,
  updateProductVariantStatusService,
  getProductVariantStatsService,
  getProductVariantsByProductIdService,
} from "../services/productVariant.service.js";

// ======================================================
// Create Product Variant
// ======================================================

export const createProductVariant = async (req, res, next) => {
  try {
    const data = createProductVariantSchema.parse(req.body);

    const variant = await createProductVariantService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Product variant created successfully.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Product Variants
// ======================================================

export const getAllProductVariants = async (req, res, next) => {
  try {
    const variants = await getAllProductVariantsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Product Variant By Id
// ======================================================

export const getProductVariantById = async (req, res, next) => {
  try {
    const variant = await getProductVariantByIdService(
      req.params.id,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Product Variant
// ======================================================

export const updateProductVariant = async (req, res, next) => {
  try {
    const data = updateProductVariantSchema.parse(req.body);

    const variant = await updateProductVariantService(
      req.params.id,
      req.user.id,
      data,
    );

    return res.status(200).json({
      success: true,
      message: "Product variant updated successfully.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Product Variant
// ======================================================

export const deleteProductVariant = async (req, res, next) => {
  try {
    await deleteProductVariantService(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Product variant deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Product Variant Status
// ======================================================

export const updateProductVariantStatus = async (req, res, next) => {
  try {
    const { isActive } = updateProductVariantStatusSchema.parse(req.body);

    const variant = await updateProductVariantStatusService(
      req.params.id,
      req.user.id,
      isActive,
    );

    return res.status(200).json({
      success: true,
      message: `Product variant ${
        isActive ? "activated" : "deactivated"
      } successfully.`,
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Product Variant Stats
// ======================================================

export const getProductVariantStats = async (req, res, next) => {
  try {
    const stats = await getProductVariantStatsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getVariantsByProduct = async (req, res, next) => {
  try {
    const variants = await getProductVariantsByProductIdService(
      req.params.productId,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};
