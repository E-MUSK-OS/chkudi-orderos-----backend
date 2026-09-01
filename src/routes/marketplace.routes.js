import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createMarketplace,
  getMarketplaces,
  getMarketplaceById,
  updateMarketplace,
  deleteMarketplace,
  toggleMarketplaceStatus,
} from "../controllers/marketplace.controller.js";

const router = Router();

// ==================================================================================
// ============================== MARKETPLACE ROUTES ================================
// ==================================================================================

// Create Marketplace
router.post("/", verifyJWT, createMarketplace);

// Get All Marketplaces
router.get("/", verifyJWT, getMarketplaces);

// Get Marketplace By Id
router.get("/:id", verifyJWT, getMarketplaceById);

// Update Marketplace
router.patch("/:id", verifyJWT, updateMarketplace);

// Toggle Marketplace Status
router.patch("/:id/status", verifyJWT, toggleMarketplaceStatus);

// Delete Marketplace
router.delete("/:id", verifyJWT, deleteMarketplace);

export default router;