import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  savePrintedOrdersController,
  getAmazonOrdersController,
  getDailySummaryController,
  updatePackingScanStatusByAwbController,
  updatePackingScanStatusByIdController,
} from "../controllers/amazonOrder.controller.js";
import {
  saveBatchController,
  getBatchHistoryController,
  getBatchByIdController,
  serveBatchFileController,
  deleteBatchController,
  attachBatchFilesController,
} from "../controllers/amazonBatch.controller.js";
import { uploadAmazonBatchFiles } from "../middleware/amazonBatch.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.use(verifyJWT);

// ==========================================
// 7-Day History & Processed Batches Routes
// ==========================================

// Save a processed batch with initial documents (summary, results, combinedPdf)
router.post("/batches", requirePermission("order-process/amazon/order-process", "create"), uploadAmazonBatchFiles, saveBatchController);

// Attach additional documents to an existing batch (originalPdf, zplPdf, unmatched)
router.post("/batches/:id/files", requirePermission("order-process/amazon/order-process", "create"), uploadAmazonBatchFiles, attachBatchFilesController);

// Get 7-day history list of batches
router.get("/batches/history", requirePermission("order-process/amazon/order-process", "read"), getBatchHistoryController);

// Get full details of a specific batch (summary, results, file URLs)
router.get("/batches/:id", requirePermission("order-process/amazon/order-process", "read"), getBatchByIdController);

// Stream / download a specific batch PDF file (combined, zpl, original)
router.get("/batches/:id/files/:fileType", requirePermission("order-process/amazon/order-process", "read"), serveBatchFileController);

// Delete a specific batch and its printed orders
router.delete("/batches/:id", requirePermission("order-process/amazon/order-process", "delete"), deleteBatchController);

// ==========================================
// Printed Orders & Scanning Routes
// ==========================================

// Save printed orders
router.post("/save-printed", savePrintedOrdersController);

// Get permanent daily summary (total, scanned, pending) by date
router.get("/summary", getDailySummaryController);

// List orders with search, filter, pagination
router.get("/", getAmazonOrdersController);

// Update packing scan status by AWB / Tracking ID
router.patch("/scan/:awb", updatePackingScanStatusByAwbController);

// Update packing scan status by ID
router.patch("/:id/status", updatePackingScanStatusByIdController);

export default router;
