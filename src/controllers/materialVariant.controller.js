import {
  createMaterialVariantSchema,
  updateMaterialVariantSchema,
  updateMaterialVariantStatusSchema,
} from "../validations/materialVariant.validation.js";

import {
  createMaterialVariantService,
  getAllMaterialVariantsService,
  getMaterialVariantByIdService,
  updateMaterialVariantService,
  deleteMaterialVariantService,
  updateMaterialVariantStatusService,
  getMaterialVariantStatsService,
  getMaterialVariantsByMaterialIdService,
} from "../services/materialVariant.service.js";

// ======================================================
// Create Material Variant
// ======================================================

export const createMaterialVariant = async (req, res, next) => {
  try {
    const data = createMaterialVariantSchema.parse(req.body);
    const variant = await createMaterialVariantService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Material variant created successfully.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Material Variants
// ======================================================

export const getAllMaterialVariants = async (req, res, next) => {
  try {
    const variants = await getAllMaterialVariantsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Material Variant By Id
// ======================================================

export const getMaterialVariantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const variant = await getMaterialVariantByIdService(id, req.user.id);

    return res.status(200).json({
      success: true,
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Material Variant
// ======================================================

export const updateMaterialVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateMaterialVariantSchema.parse(req.body);

    const variant = await updateMaterialVariantService(
      id,
      req.user.id,
      data,
    );

    return res.status(200).json({
      success: true,
      message: "Material variant updated successfully.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Material Variant
// ======================================================

export const deleteMaterialVariant = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteMaterialVariantService(id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Material variant deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Material Variant Status
// ======================================================

export const updateMaterialVariantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = updateMaterialVariantStatusSchema.parse(req.body);

    const variant = await updateMaterialVariantStatusService(
      id,
      req.user.id,
      isActive,
    );

    return res.status(200).json({
      success: true,
      message: "Material variant status updated successfully.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Material Variant Stats
// ======================================================

export const getMaterialVariantStats = async (req, res, next) => {
  try {
    const stats = await getMaterialVariantStatsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Variants By Material Id
// ======================================================

export const getVariantsByMaterial = async (req, res, next) => {
  try {
    const { materialId } = req.params;

    const variants = await getMaterialVariantsByMaterialIdService(
      materialId,
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

