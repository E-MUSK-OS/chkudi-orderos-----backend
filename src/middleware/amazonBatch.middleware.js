import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAmazonBatchDir } from "../utils/amazonBatchNasPath.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!req.batchId) {
        req.batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      }
      const uploadDir = getAmazonBatchDir(req.batchId);
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    let baseName = file.originalname
      ? path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_")
      : "file";

    if (file.fieldname === "combinedPdf") baseName = "combined_match";
    else if (file.fieldname === "zplPdf") baseName = "converted_zpl";
    else if (file.fieldname === "originalPdf") baseName = "original_invoices";
    else if (file.fieldname === "unmatchedPdf") baseName = "unmatched_invoices";
    else if (file.fieldname === "unmatchedZplPdf") baseName = "unmatched_zpl";

    cb(null, `${baseName}_${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB per file (handles very large batches of 30+ files)
    fieldSize: 200 * 1024 * 1024,      // 200MB for results and summary JSON
    fields: 100,                       // Up to 100 text fields
    files: 100,                        // Up to 100 files simultaneously (supports 30+ files with ease)
    parts: 200,                        // Up to 200 total parts
  },
  fileFilter(req, file, cb) {
    const isAllowed =
      !file.mimetype ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.toLowerCase().endsWith(".pdf") ||
      file.originalname.toLowerCase().endsWith(".zpl") ||
      file.originalname.toLowerCase().endsWith(".txt") ||
      file.originalname.toLowerCase().endsWith(".jpl");

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(null, true); // Accept and stream safely to disk
    }
  },
}).any(); // Use .any() so multer accepts any number of files (30+ files) without field restrictions

export const uploadAmazonBatchFiles = (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("[Multer Error in Amazon Batch Upload]:", err);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message} (${err.code} on field ${err.field || "unknown"})`,
      });
    } else if (err) {
      console.error("[General Upload Error in Amazon Batch]:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to process batch files",
      });
    }
    next();
  });
};
