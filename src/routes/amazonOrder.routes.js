import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  savePrintedOrdersController,
  getAmazonOrdersController,
  updatePackingScanStatusByAwbController,
  updatePackingScanStatusByIdController,
} from "../controllers/amazonOrder.controller.js";
import {
  saveBatchController,
  getBatchHistoryController,
  getBatchByIdController,
  serveBatchFileController,
  deleteBatchController,
} from "../controllers/amazonBatch.controller.js";
import { uploadAmazonBatchFiles } from "../middleware/amazonBatch.middleware.js";

const router = Router();

router.use(verifyJWT);

// ==========================================
// 7-Day History & Processed Batches Routes
// ==========================================

// Save a processed batch with the 3 PDF documents
router.post("/batches", uploadAmazonBatchFiles, saveBatchController);

// Get 7-day history list of batches
router.get("/batches/history", getBatchHistoryController);

// Get full details of a specific batch (summary, results, file URLs)
router.get("/batches/:id", getBatchByIdController);

// Stream / download a specific batch PDF file (combined, zpl, original)
router.get("/batches/:id/files/:fileType", serveBatchFileController);

// Delete a specific batch and its printed orders
router.delete("/batches/:id", deleteBatchController);

// ==========================================
// Printed Orders & Scanning Routes
// ==========================================

// Save printed orders
router.post("/save-printed", savePrintedOrdersController);

// List orders with search, filter, pagination
router.get("/", getAmazonOrdersController);

// Update packing scan status by AWB / Tracking ID
router.patch("/scan/:awb", updatePackingScanStatusByAwbController);

// Update packing scan status by ID
router.patch("/:id/status", updatePackingScanStatusByIdController);

export default router;
