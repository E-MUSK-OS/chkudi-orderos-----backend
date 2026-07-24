import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  updateWarehouseStatus,
  getWarehouseStats,
} from "../controllers/warehouse.controller.js";

const router = express.Router();

// ======================================================
// Warehouse Routes
// ======================================================

router.post("/", verifyJWT, createWarehouse);
router.get("/stats", verifyJWT, getWarehouseStats);

router.get("/", verifyJWT, getAllWarehouses);

router.get("/:id", verifyJWT, getWarehouseById);

router.patch("/:id/status", verifyJWT, updateWarehouseStatus);

router.put("/:id", verifyJWT, updateWarehouse);

router.delete("/:id", verifyJWT, deleteWarehouse);

export default router;
