import {
  saveSheetDraftService,
  getSheetDraftService,
  deleteSheetDraftService,
} from "../services/sheetDraft.service.js";

// ==================================================================================
// ============================== SAVE DRAFT =========================================
// ==================================================================================

export const saveSheetDraft = async (req, res, next) => {
  try {
    const draft = await saveSheetDraftService(
      req.user.id,
      req.body.rows,
    );

    return res.status(200).json({
      success: true,
      message: "Draft saved successfully.",
      data: draft,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================== GET DRAFT ==========================================
// ==================================================================================

export const getSheetDraft = async (req, res, next) => {
  try {
    const draft = await getSheetDraftService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Draft fetched successfully.",
      data: draft,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================== DELETE DRAFT =======================================
// ==================================================================================

export const deleteSheetDraft = async (req, res, next) => {
  try {
    const result = await deleteSheetDraftService(req.user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};