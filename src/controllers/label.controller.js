import { createTemplateService, getTemplatesService, getTemplateByIdService, updateTemplateService, deleteTemplateService, lookupProductService } from "../services/label.service.js";

// ==================================================================================
// ============================== CREATE TEMPLATE ====================================
// ==================================================================================

export const createTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const template = await createTemplateService(userId, data);

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================== GET TEMPLATES ======================================
// ==================================================================================

export const getTemplates = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const templates = await getTemplatesService(userId);

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================== GET TEMPLATE BY ID ================================
// ==================================================================================

export const getTemplateById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const template = await getTemplateByIdService(userId, id);

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================== UPDATE TEMPLATE ====================================
// ==================================================================================

export const updateTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const data = req.body;

    const template = await updateTemplateService(userId, id, data);

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================== DELETE TEMPLATE ====================================
// ==================================================================================

export const deleteTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await deleteTemplateService(userId, id);

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================== LOOKUP PRODUCT ====================================
// ==================================================================================

export const lookupProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    const data = await lookupProductService(userId, q);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

