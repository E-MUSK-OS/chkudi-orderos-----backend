import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createProductVariant,
  getAllProductVariants,
  getProductVariantById,
  updateProductVariant,
  deleteProductVariant,
  updateProductVariantStatus,
  getProductVariantStats,
  getVariantsByProduct,
} from "../controllers/productVariant.controller.js";

const router = express.Router();

// ======================================================
// Product Variant Routes
// ======================================================

router.post("/", verifyJWT, createProductVariant);

router.get("/stats", verifyJWT, getProductVariantStats);

router.get("/", verifyJWT, getAllProductVariants);

router.get("/product/:productId", verifyJWT, getVariantsByProduct);

router.get("/:id", verifyJWT, getProductVariantById);

router.patch("/:id/status", verifyJWT, updateProductVariantStatus);

router.put("/:id", verifyJWT, updateProductVariant);

router.delete("/:id", verifyJWT, deleteProductVariant);


export default router;
