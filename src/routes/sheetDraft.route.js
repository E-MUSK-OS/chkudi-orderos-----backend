import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  saveSheetDraft,
  getSheetDraft,
  deleteSheetDraft,
} from "../controllers/sheetDraft.controller.js";

const router = express.Router();

// ==================================================================================
// ============================== SHEET DRAFT ========================================
// ==================================================================================

// Save Draft
router.post("/", verifyJWT, saveSheetDraft);

// Get Draft
router.get("/", verifyJWT, getSheetDraft);

// Delete Draft
router.delete("/", verifyJWT, deleteSheetDraft);

export default router;