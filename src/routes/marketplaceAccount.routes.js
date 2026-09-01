import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createMarketplaceAccount,
  getMarketplaceAccounts,
  getMarketplaceAccountById,
  updateMarketplaceAccount,
  deleteMarketplaceAccount,
  toggleMarketplaceAccountStatus,
} from "../controllers/marketplaceAccount.controller.js";

const router = Router();

// ==================================================================================
// ======================= MARKETPLACE ACCOUNT ROUTES ===============================
// ==================================================================================

// Create Marketplace Account
router.post("/", verifyJWT, createMarketplaceAccount);

// Get All Marketplace Accounts
router.get("/", verifyJWT, getMarketplaceAccounts);

// Get Marketplace Account By Id
router.get("/:id", verifyJWT, getMarketplaceAccountById);

// Update Marketplace Account
router.patch("/:id", verifyJWT, updateMarketplaceAccount);

// Toggle Marketplace Account Status
router.patch("/:id/status", verifyJWT, toggleMarketplaceAccountStatus);

// Delete Marketplace Account
router.delete("/:id", verifyJWT, deleteMarketplaceAccount);

export default router;