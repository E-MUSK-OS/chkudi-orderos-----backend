import {
  getSheetDraftByUserId,
  createSheetDraft,
  updateSheetDraft,
  deleteSheetDraft,
  deleteExpiredSheetDrafts,
} from "../repositories/sheetDraft.repository.js";

import { AppError } from "../utils/AppError.js";

// ==================================================================================
// ============================== SAVE DRAFT =========================================
// ==================================================================================

export const saveSheetDraftService = async (userId, rows) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  if (!Array.isArray(rows)) {
    throw new AppError("Rows are required.", 400);
  }

  // Check Existing Draft
  const existingDraft = await getSheetDraftByUserId(userId);

  // Update Existing Draft
  if (existingDraft) {
    return await updateSheetDraft(existingDraft.id, {
      rows,
    });
  }

  // Create New Draft
  return await createSheetDraft({
    userId,
    rows,
  });
};

// ==================================================================================
// ============================== GET DRAFT ==========================================
// ==================================================================================

export const getSheetDraftService = async (userId) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  return await getSheetDraftByUserId(userId);
};

// ==================================================================================
// ============================== DELETE DRAFT =======================================
// ==================================================================================

export const deleteSheetDraftService = async (userId) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const draft = await getSheetDraftByUserId(userId);

  if (!draft) {
    throw new AppError("Draft not found.", 404);
  }

  await deleteSheetDraft(draft.id);

  return {
    success: true,
    message: "Draft deleted successfully.",
  };
};

export const deleteExpiredSheetDraftsService = async () => {
  // Delete drafts older than 24 hours
  const expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  console.log("Current Time :", new Date());
  console.log("Expiry Time  :", expiryDate);

  const result = await deleteExpiredSheetDrafts(expiryDate);

  console.log("Delete Result :", result);

  return result;
};
