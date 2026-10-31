import {
  createMaterialSchema,
  updateMaterialSchema,
  updateMaterialStatusSchema,
  createDropdownOptionSchema,
} from "../validations/material.validation.js";

import {
  createMaterialService,
  getAllMaterialsService,
  getMaterialByIdService,
  updateMaterialService,
  deleteMaterialService,
  updateMaterialStatusService,
  getMaterialStatsService,
  importMaterialsFromExcelService,
  getDropdownOptionsService,
  saveDropdownOptionService,
} from "../services/material.service.js";

// ======================================================
// Create Material
// ======================================================

export const createMaterial = async (req, res, next) => {
  try {
    const data = createMaterialSchema.parse(req.body);
    const material = await createMaterialService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Material created successfully.",
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Materials
// ======================================================

export const getAllMaterials = async (req, res, next) => {
  try {
    const materials = await getAllMaterialsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Material By Id
// ======================================================

export const getMaterialById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const material = await getMaterialByIdService(id, req.user.id);

    return res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Material
// ======================================================

export const updateMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateMaterialSchema.parse(req.body);

    const material = await updateMaterialService(id, req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Material updated successfully.",
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Material
// ======================================================

export const deleteMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteMaterialService(id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Material deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Material Status
// ======================================================

export const updateMaterialStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = updateMaterialStatusSchema.parse(req.body);

    const material = await updateMaterialStatusService(
      id,
      req.user.id,
      isActive,
    );

    return res.status(200).json({
      success: true,
      message: "Material status updated successfully.",
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Material Stats
// ======================================================

export const getMaterialStats = async (req, res, next) => {
  try {
    const stats = await getMaterialStatsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Import Materials From Excel
// ======================================================

export const importMaterialsFromExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an excel file.",
      });
    }

    const result = await importMaterialsFromExcelService(req.user.id, req.file.buffer);

    const msg =
      result.updatedCount > 0
        ? `Successfully imported ${result.importedCount} new and updated ${result.updatedCount} existing material(s).`
        : `Successfully imported ${result.importedCount} material(s).`;

    return res.status(200).json({
      success: true,
      message: msg,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Dropdown Options
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

export const saveDropdownOption = async (req, res, next) => {
  try {
    const data = createDropdownOptionSchema.parse(req.body);
    const saved = await saveDropdownOptionService(req.user.id, data);
    return res.status(201).json({
      success: true,
      message: "Option saved successfully.",
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

