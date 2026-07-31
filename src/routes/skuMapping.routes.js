import express from "express";
import multer from "multer";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  getSkuMappings,
  getSkuMappingById,
  getSkuMappingByShortSku,
  updateSkuMapping,
  deleteSkuMapping,
  importSkuMapping,
  getSkuSuggestionsController,
} from "../controllers/skuMapping.controller.js";

const router = express.Router();

// Memory Storage
const upload = multer({
  storage: multer.memoryStorage(),
});

// ==================================================================================
// ============================== SKU MAPPINGS ======================================
// ==================================================================================

router.get("/", verifyJWT, getSkuMappings);

router.get("/search", verifyJWT, getSkuMappingByShortSku);

router.get("/suggestions", verifyJWT, getSkuSuggestionsController);

router.get("/:id", verifyJWT, getSkuMappingById);

router.put("/:id", verifyJWT, updateSkuMapping);

router.delete("/:id", verifyJWT, deleteSkuMapping);

router.post("/import", verifyJWT, upload.single("file"), importSkuMapping);

export default router;
