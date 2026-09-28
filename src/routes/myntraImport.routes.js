import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import excelUpload from "../middleware/excelUpload.middleware.js";
import {
  importMyntraExcel,
  getMyntraImports,
  getAllMyntraMappings,
  deleteMyntraImport,
  clearAllMyntraImports,
  createMyntraImport,
  updateMyntraImport,
} from "../controllers/myntraImport.controller.js";

const router = express.Router();

// Upload Excel file - both /excel and /import-excel supported
router.post(
  "/excel",
  verifyJWT,
  excelUpload.single("file"),
  importMyntraExcel
);
router.post(
  "/import-excel",
  verifyJWT,
  excelUpload.single("file"),
  importMyntraExcel
);

// Manual create and update
router.post("/", verifyJWT, createMyntraImport);
router.put("/:id", verifyJWT, updateMyntraImport);

// Get all mappings as dictionary for O(1) picklist lookup
router.get("/all", verifyJWT, getAllMyntraMappings);

// Paginated query / list
router.get("/", verifyJWT, getMyntraImports);

// Delete operations
router.delete("/clear-all", verifyJWT, clearAllMyntraImports);
router.delete("/:id", verifyJWT, deleteMyntraImport);

export default router;
