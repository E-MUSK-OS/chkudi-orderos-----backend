import uploadImage from '../middleware/uploadImage.middleware.js';
import express from "express";

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

router.post("/import-excel", verifyJWT, excelUpload.single("file"), importProductsFromExcel);

router.post("/", verifyJWT, createProduct);

router.get("/stats", verifyJWT, getProductStats);

router.get("/", verifyJWT, getAllProducts);


// Product Image endpoints (NAS VMS storage)
router.post("/upload-image", verifyJWT, uploadImage.fields([{ name: "image", maxCount: 1 }, { name: "file", maxCount: 1 }]), uploadProductImage);
router.get("/images", verifyJWT, getProductImages);
router.get("/image", streamProductImage);

router.get("/:id", verifyJWT, getProductById);

router.patch("/:id/status", verifyJWT, updateProductStatus);

router.put("/:id", verifyJWT, updateProduct);

router.delete("/:id", verifyJWT, deleteProduct);

export default router;