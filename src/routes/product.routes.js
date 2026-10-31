import uploadImage from '../middleware/uploadImage.middleware.js';
import express from "express";
import { requirePermission } from "../middleware/permission.middleware.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import excelUpload from "../middleware/excelUpload.middleware.js";

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  getProductStats,
  importProductsFromExcel,
  getDropdownOptions,
  saveDropdownOption,
  uploadProductImage,
  getProductImages,
  streamProductImage,
} from "../controllers/product.controller.js";

const router = express.Router();

// ======================================================
// Product Routes
// ======================================================

router.get("/dropdown-options", verifyJWT, getDropdownOptions);
router.post("/dropdown-options", verifyJWT, saveDropdownOption);

router.post("/import-excel", verifyJWT, requirePermission("settings/manage-product", "create"), excelUpload.single("file"), importProductsFromExcel);

router.post("/", verifyJWT, requirePermission("settings/manage-product", "create"), createProduct);

router.get("/stats", verifyJWT, requirePermission("settings/manage-product", "read"), getProductStats);

router.get("/", verifyJWT, requirePermission("settings/manage-product", "read"), getAllProducts);


// Product Image endpoints (NAS VMS storage)
router.post("/upload-image", verifyJWT, uploadImage.fields([{ name: "image", maxCount: 1 }, { name: "file", maxCount: 1 }]), uploadProductImage);
router.get("/images", verifyJWT, getProductImages);
router.get("/image", streamProductImage);

router.get("/:id", verifyJWT, requirePermission("settings/manage-product", "read"), getProductById);

router.patch("/:id/status", verifyJWT, requirePermission("settings/manage-product", "update"), updateProductStatus);

router.put("/:id", verifyJWT, requirePermission("settings/manage-product", "update"), updateProduct);

router.delete("/:id", verifyJWT, requirePermission("settings/manage-product", "delete"), deleteProduct);

export default router;