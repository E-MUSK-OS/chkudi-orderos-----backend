import { ZodError } from "zod";

import { createTagLoopSchema } from "../validations/tagLoop.validation.js";

import {
  createTagLoopService,
  getTagLoopsService,
  getTagLoopDashboardService,
  exportTagLoopService,
  deleteTagLoopService,
} from "../services/tagLoop.service.js";

// ========================================
// Create Tag Loop
// ========================================

export const createTagLoop = async (req, res) => {
  try {
    const data = createTagLoopSchema.parse(req.body);

    const tagLoop = await createTagLoopService({
      userId: req.user.id,
      ...data,
    });

    return res.status(201).json({
      success: true,
      message: "Tag Loop created successfully.",
      data: tagLoop,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Get Tag Loops
// ========================================

export const getTagLoops = async (req, res) => {
  try {
    const tagLoops = await getTagLoopsService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Tag Loops fetched successfully.",
      data: tagLoops,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Dashboard
// ========================================

export const getTagLoopDashboard = async (req, res) => {
  try {
    const dashboard = await getTagLoopDashboardService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Dashboard fetched successfully.",
      data: dashboard,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Export Tag Loop
// ========================================

export const exportTagLoop = async (req, res) => {
  try {
    const { workbook, fileName } = await exportTagLoopService({
      userId: req.user.id,
      loopId: req.params.id,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Delete Tag Loop
// ========================================

export const deleteTagLoop = async (req, res) => {
  try {
    await deleteTagLoopService({
      userId: req.user.id,
      loopId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      message: "Tag Loop deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
