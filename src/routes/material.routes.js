import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";
import excelUpload from "../middleware/excelUpload.middleware.js";
import uploadImage from "../middleware/uploadImage.middleware.js";

import {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  updateMaterialStatus,
  getMaterialStats,
  importMaterialsFromExcel,
  getDropdownOptions,
  saveDropdownOption,
} from "../controllers/material.controller.js";

import {
  uploadProductImage,
  getProductImages,
  streamProductImage,
} from "../controllers/product.controller.js";

const router = express.Router();

// ======================================================
// Material Routes
// ======================================================

router.get("/dropdown-options", verifyJWT, getDropdownOptions);
router.post("/dropdown-options", verifyJWT, saveDropdownOption);

router.post("/import-excel", verifyJWT, excelUpload.single("file"), importMaterialsFromExcel);

router.post("/", verifyJWT, createMaterial);

router.get("/stats", verifyJWT, getMaterialStats);

router.get("/", verifyJWT, getAllMaterials);

// Material Image endpoints (NAS VMS storage)
router.post("/upload-image", verifyJWT, uploadImage.fields([{ name: "image", maxCount: 1 }, { name: "file", maxCount: 1 }]), uploadProductImage);
router.get("/images", verifyJWT, getProductImages);
router.get("/image", streamProductImage);

router.get("/:id", verifyJWT, getMaterialById);

router.patch("/:id/status", verifyJWT, updateMaterialStatus);

router.put("/:id", verifyJWT, updateMaterial);

router.delete("/:id", verifyJWT, deleteMaterial);

export default router;

