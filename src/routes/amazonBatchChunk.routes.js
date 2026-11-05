import { Router } from "express";
import multer from "multer";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  initBatchController,
  uploadChunkController,
  processBatchController,
  getBatchStatusController,
} from "../controllers/amazonBatchChunk.controller.js";

const router = Router();

// Memory storage for chunks (they are small, e.g., 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max chunk size
  },
});

router.use(verifyJWT);

// 1. Init batch and get ID
router.post("/init", requirePermission("order-process/amazon/order-process", "create"), initBatchController);

// 2. Upload a single chunk
router.post("/:batchId/chunk", requirePermission("order-process/amazon/order-process", "create"), upload.single("chunk"), uploadChunkController);

// 3. Finalize and process
router.post("/:batchId/process", requirePermission("order-process/amazon/order-process", "create"), processBatchController);

// 4. Poll status
router.get("/:batchId/status", requirePermission("order-process/amazon/order-process", "read"), getBatchStatusController);

export default router;

