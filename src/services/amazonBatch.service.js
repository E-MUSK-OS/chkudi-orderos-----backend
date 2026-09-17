import path from "path";
import fs from "fs";
import {
  createAmazonProcessBatch,
  getAmazonProcessBatchesHistory,
  getAmazonProcessBatchById,
  deleteExpiredAmazonProcessBatches,
  deleteAmazonBatch,
} from "../repositories/amazonBatch.repository.js";
import { getAmazonBatchDir, resolveBatchFilePath } from "../utils/amazonBatchNasPath.js";

/**
 * Helper to construct public URL for a batch file
 */
const buildFileUrl = (baseUrl, relativePath) => {
  if (!relativePath) return null;
  const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
  const cleanRel = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${cleanBase}${cleanRel}`;
};

/**
 * Save newly processed Amazon batch
 */
export const saveBatchService = async ({
  userId,
  summary,
  results,
  uploadedFiles,
  base64Files,
  batchNumber,
  batchDate,
  baseUrl = process.env.BACKEND_URL || "http://localhost:5000",
  batchId,
}) => {
  const currentBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const uploadDir = getAmazonBatchDir(currentBatchId);

  const filePaths = {};
  const fileUrls = {};

  // 1. Process files from multer disk storage if present (supports array from .any() or object from .fields())
  if (uploadedFiles) {
    const fileList = Array.isArray(uploadedFiles)
      ? uploadedFiles
      : Object.values(uploadedFiles).flat().filter(Boolean);

    const findFile = (target) =>
      fileList.find(
        (f) =>
          f.fieldname === target ||
          f.filename?.toLowerCase().includes(target.toLowerCase())
      );

    const combined = findFile("combinedPdf") || findFile("combined_match");
    if (combined) {
      const relPath = `/uploads/amazon-batches/${currentBatchId}/${combined.filename}`;
      filePaths.combinedPdfPath = combined.path;
      fileUrls.combinedPdfUrl = buildFileUrl(baseUrl, relPath);
    }

    const zpl = findFile("zplPdf") || findFile("converted_zpl");
    if (zpl) {
      const relPath = `/uploads/amazon-batches/${currentBatchId}/${zpl.filename}`;
      filePaths.zplPdfPath = zpl.path;
      fileUrls.zplPdfUrl = buildFileUrl(baseUrl, relPath);
    }

    const original = findFile("originalPdf") || findFile("original_invoices");
    if (original) {
      const relPath = `/uploads/amazon-batches/${currentBatchId}/${original.filename}`;
      filePaths.originalPdfPath = original.path;
      fileUrls.originalPdfUrl = buildFileUrl(baseUrl, relPath);
    }

    const unmatchedPdf = findFile("unmatchedPdf") || findFile("unmatched_invoices");
    if (unmatchedPdf) {
      const relPath = `/uploads/amazon-batches/${currentBatchId}/${unmatchedPdf.filename}`;
      filePaths.unmatchedPdfPath = unmatchedPdf.path;
      fileUrls.unmatchedPdfUrl = buildFileUrl(baseUrl, relPath);
    }

    const unmatchedZpl = findFile("unmatchedZplPdf") || findFile("unmatched_zpl");
    if (unmatchedZpl) {
      const relPath = `/uploads/amazon-batches/${currentBatchId}/${unmatchedZpl.filename}`;
      filePaths.unmatchedZplPdfPath = unmatchedZpl.path;
      fileUrls.unmatchedZplPdfUrl = buildFileUrl(baseUrl, relPath);
    }
  }

  // 2. Fallback: If sent as base64 in body, write to disk
  if (base64Files) {
    if (!filePaths.combinedPdfPath && base64Files.combinedPdfBase64) {
      const filePath = path.join(uploadDir, "combined_match.pdf");
      const cleanB64 = base64Files.combinedPdfBase64.includes(",")
        ? base64Files.combinedPdfBase64.split(",")[1]
        : base64Files.combinedPdfBase64;
      fs.writeFileSync(filePath, Buffer.from(cleanB64, "base64"));
      filePaths.combinedPdfPath = filePath;
      fileUrls.combinedPdfUrl = buildFileUrl(baseUrl, `/uploads/amazon-batches/${currentBatchId}/combined_match.pdf`);
    }

    if (!filePaths.zplPdfPath && base64Files.convertedZplPdfBase64) {
      const filePath = path.join(uploadDir, "converted_zpl.pdf");
      const cleanB64 = base64Files.convertedZplPdfBase64.includes(",")
        ? base64Files.convertedZplPdfBase64.split(",")[1]
        : base64Files.convertedZplPdfBase64;
      fs.writeFileSync(filePath, Buffer.from(cleanB64, "base64"));
      filePaths.zplPdfPath = filePath;
      fileUrls.zplPdfUrl = buildFileUrl(baseUrl, `/uploads/amazon-batches/${currentBatchId}/converted_zpl.pdf`);
    }

    if (!filePaths.originalPdfPath && base64Files.originalPdfBase64) {
      const filePath = path.join(uploadDir, "original_invoices.pdf");
      const cleanB64 = base64Files.originalPdfBase64.includes(",")
        ? base64Files.originalPdfBase64.split(",")[1]
        : base64Files.originalPdfBase64;
      fs.writeFileSync(filePath, Buffer.from(cleanB64, "base64"));
      filePaths.originalPdfPath = filePath;
      fileUrls.originalPdfUrl = buildFileUrl(baseUrl, `/uploads/amazon-batches/${currentBatchId}/original_invoices.pdf`);
    }

    if (!filePaths.unmatchedPdfPath && base64Files.unmatchedPdfBase64) {
      const filePath = path.join(uploadDir, "unmatched_invoices.pdf");
      const cleanB64 = base64Files.unmatchedPdfBase64.includes(",")
        ? base64Files.unmatchedPdfBase64.split(",")[1]
        : base64Files.unmatchedPdfBase64;
      fs.writeFileSync(filePath, Buffer.from(cleanB64, "base64"));
      filePaths.unmatchedPdfPath = filePath;
      fileUrls.unmatchedPdfUrl = buildFileUrl(baseUrl, `/uploads/amazon-batches/${currentBatchId}/unmatched_invoices.pdf`);
    }

    if (!filePaths.unmatchedZplPdfPath && base64Files.unmatchedZplBase64) {
      const filePath = path.join(uploadDir, "unmatched_zpl.pdf");
      const cleanB64 = base64Files.unmatchedZplBase64.includes(",")
        ? base64Files.unmatchedZplBase64.split(",")[1]
        : base64Files.unmatchedZplBase64;
      fs.writeFileSync(filePath, Buffer.from(cleanB64, "base64"));
      filePaths.unmatchedZplPdfPath = filePath;
      fileUrls.unmatchedZplPdfUrl = buildFileUrl(baseUrl, `/uploads/amazon-batches/${currentBatchId}/unmatched_zpl.pdf`);
    }
  }

  // Save to database
  const batch = await createAmazonProcessBatch({
    userId,
    batchNumber,
    batchDate,
    summary,
    results,
    fileUrls,
    filePaths,
  });

  return batch;
};

/**
 * Get 7-day history list of active batches
 */
export const getBatchHistoryService = async (userId, days = 7) => {
  return await getAmazonProcessBatchesHistory(userId, days);
};

/**
 * Get full batch details by ID
 */
export const getBatchByIdService = async (userId, batchId) => {
  const batch = await getAmazonProcessBatchById(userId, batchId);
  if (!batch) {
    throw new Error("Batch not found or has already expired.");
  }
  return batch;
};

/**
 * Get file path for streaming a specific batch file
 */
export const getBatchFilePathService = async (userId, batchId, fileType) => {
  const batch = await getAmazonProcessBatchById(userId, batchId);
  if (!batch) {
    throw new Error("Batch not found or has already expired.");
  }

  let filePath = null;
  let fileName = `${fileType}.pdf`;

  if (fileType === "combined") {
    filePath = batch.combinedPdfPath;
    fileName = `Amazon_Matched_Paired_${batch.id}.pdf`;
  } else if (fileType === "zpl") {
    filePath = batch.zplPdfPath;
    fileName = `Amazon_ZPL_Converted_${batch.id}.pdf`;
  } else if (fileType === "original") {
    filePath = batch.originalPdfPath;
    fileName = batch.pdfFileName || `Amazon_Original_Invoices_${batch.id}.pdf`;
  } else if (fileType === "unmatched-pdf" || fileType === "unmatchedPdf") {
    filePath = batch.unmatchedPdfPath;
    fileName = `Amazon_Unmatched_Invoices_${batch.id}.pdf`;
  } else if (fileType === "unmatched-zpl" || fileType === "unmatchedZpl") {
    filePath = batch.unmatchedZplPdfPath;
    fileName = `Amazon_Unmatched_ZPL_${batch.id}.pdf`;
  }

  // Resolve and check if file exists (with fallback to current NAS or local folder)
  if (!filePath || !fs.existsSync(filePath)) {
    filePath = resolveBatchFilePath(filePath, batch.id, fileName);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Requested file "${fileType}" not found on server.`);
  }

  return { filePath, fileName };
};

/**
 * Delete expired batches (hourly cron)
 */
export const deleteExpiredBatchesService = async () => {
  return await deleteExpiredAmazonProcessBatches();
};

/**
 * Delete a batch and its printed orders
 */
export const deleteAmazonBatchService = async (userId, batchId) => {
  return await deleteAmazonBatch(userId, batchId);
};

