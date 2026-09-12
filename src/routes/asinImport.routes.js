import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import excelUpload from "../middleware/excelUpload.middleware.js";
import {
  importAsinFromExcel,
  getAsinImports,
  createAsinImport,
  updateAsinImport,
  deleteAsinImport,
  clearAsinImports,
} from "../controllers/asinImport.controller.js";

const router = express.Router();

router.post(
  "/import-excel",
  verifyJWT,
  excelUpload.single("file"),
  importAsinFromExcel
);

router.post("/", verifyJWT, createAsinImport);
router.get("/", verifyJWT, getAsinImports);
router.put("/:id", verifyJWT, updateAsinImport);
router.delete("/clear-all", verifyJWT, clearAsinImports);
router.delete("/:id", verifyJWT, deleteAsinImport);

export default router;

