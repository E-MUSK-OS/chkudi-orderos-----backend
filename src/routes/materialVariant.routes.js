import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createMaterialVariant,
  getAllMaterialVariants,
  getMaterialVariantById,
  updateMaterialVariant,
  deleteMaterialVariant,
  updateMaterialVariantStatus,
  getMaterialVariantStats,
  getVariantsByMaterial,
} from "../controllers/materialVariant.controller.js";

const router = express.Router();

// ======================================================
// Material Variant Routes
// ======================================================

router.post("/", verifyJWT, createMaterialVariant);

router.get("/stats", verifyJWT, getMaterialVariantStats);

router.get("/", verifyJWT, getAllMaterialVariants);

router.get("/material/:materialId", verifyJWT, getVariantsByMaterial);

router.get("/:id", verifyJWT, getMaterialVariantById);

router.patch("/:id/status", verifyJWT, updateMaterialVariantStatus);

router.put("/:id", verifyJWT, updateMaterialVariant);

router.delete("/:id", verifyJWT, deleteMaterialVariant);

export default router;

