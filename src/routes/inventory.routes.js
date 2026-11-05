import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

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
router.get("/", verifyJWT, requirePermission("products/inventory", "read"), getInventories);

// Export Inventory Excel
router.get("/export", verifyJWT, requirePermission("products/inventory", "read"), exportInventory);

router.post("/import", verifyJWT, requirePermission("products/inventory", "create"), excelUpload.single("file"), importInventory);

// Get Inventory By Id
router.get("/:id", verifyJWT, requirePermission("products/inventory", "read"), getInventoryById);

// Update Inventory Settings
router.patch("/:id", verifyJWT, requirePermission("products/inventory", "update"), updateInventory);

// Adjust Inventory Stock
router.patch("/:id/adjust", verifyJWT, requirePermission("products/inventory", "update"), adjustInventory);

// Delete Inventory
router.delete("/:id", verifyJWT, requirePermission("products/inventory", "delete"), deleteInventory);

export default router;
