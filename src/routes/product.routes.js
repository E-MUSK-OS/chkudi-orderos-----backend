import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  getProductStats,
} from "../controllers/product.controller.js";

const router = express.Router();

// ======================================================
// Product Routes
// ======================================================

router.post("/", verifyJWT, createProduct);

router.get("/stats", verifyJWT, getProductStats);

router.get("/", verifyJWT, getAllProducts);

router.get("/:id", verifyJWT, getProductById);

router.patch("/:id/status", verifyJWT, updateProductStatus);

router.put("/:id", verifyJWT, updateProduct);

router.delete("/:id", verifyJWT, deleteProduct);

export default router;