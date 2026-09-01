import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  getInventories,
  getInventoryById,
  updateInventory,
  adjustInventory,
  deleteInventory,
  exportInventory,
  importInventory,
} from "../controllers/inventory.controller.js";
import excelUpload from "../middleware/excelUpload.middleware.js";

const router = Router();

// ==================================================================================
// ============================== INVENTORY ROUTES ==================================
// ==================================================================================

// Get All Inventories
router.get("/", verifyJWT, getInventories);

// Export Inventory Excel
router.get("/export", verifyJWT, exportInventory);

router.post("/import", verifyJWT, excelUpload.single("file"), importInventory);

// Get Inventory By Id
router.get("/:id", verifyJWT, getInventoryById);

// Update Inventory Settings
router.patch("/:id", verifyJWT, updateInventory);

// Adjust Inventory Stock
router.patch("/:id/adjust", verifyJWT, adjustInventory);

// Delete Inventory
router.delete("/:id", verifyJWT, deleteInventory);

export default router;
