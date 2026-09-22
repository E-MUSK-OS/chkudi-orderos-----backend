import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Worker } from "worker_threads";
import { getAmazonBatchDir } from "../utils/amazonBatchNasPath.js";
import { saveBatchService } from "../services/amazonBatch.service.js";

// In-memory status store (in a real app, use Redis or DB)
const batchStatuses = new Map();

/**
 * Helper to parse large JSON asynchronously in a worker thread to prevent event loop blocking
 */
const parseJsonAsync = (jsonString) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require('worker_threads');
      try {
        parentPort.postMessage(JSON.parse(workerData));
      } catch (e) {
        throw e;
      }
    `, { eval: true, workerData: jsonString });
    
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
};

/**
 * 1. Init: Generate a batchId and return it
 */
export const initBatchController = (req, res, next) => {
  try {
    const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const uploadDir = getAmazonBatchDir(batchId);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    batchStatuses.set(batchId, { status: "uploading" });
    
    res.status(200).json({ success: true, batchId });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Chunk: Receive a file chunk and append it
 * Expects: req.params.batchId, req.body.fileName, req.body.chunkIndex, req.file (the chunk)
 */
export const uploadChunkController = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    let { fileName } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No chunk file provided" });
    }

    // Security Fix: Prevent Path Traversal
    fileName = path.basename(fileName || "");

    // Map fieldnames to base names exactly as before
    if (fileName === "combinedPdf") fileName = "combined_match.pdf";
    else if (fileName === "zplPdf") fileName = "converted_zpl.pdf";
    else if (fileName === "originalPdf") fileName = "original_invoices.pdf";
    else if (fileName === "unmatchedPdf") fileName = "unmatched_invoices.pdf";
    else if (fileName === "unmatchedZplPdf") fileName = "unmatched_zpl.pdf";
    
    // Fallback security check
    if (!fileName.endsWith(".pdf")) {
      fileName = fileName + ".pdf";
    }

    const uploadDir = getAmazonBatchDir(batchId);
    const filePath = path.join(uploadDir, fileName);

    // Append chunk to the file on disk
    await fs.promises.appendFile(filePath, req.file.buffer);

    res.status(200).json({ success: true, message: `Chunk appended to ${fileName}` });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Process: Finalize and trigger background processing
 */
export const processBatchController = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    let { summary, results, batchNumber, batchDate } = req.body;

    const host = req.get("host");
    const protocol = req.protocol || "http";
    const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;

    // Acknowledge receipt immediately to bypass Cloudflare timeout
    res.status(202).json({
      success: true,
      message: "Batch processing started in background.",
      batchId
    });

    batchStatuses.set(batchId, { status: "processing" });

    // Start background processing
    (async () => {
      try {
        if (typeof summary === "string") summary = await parseJsonAsync(summary);
        if (typeof results === "string") results = await parseJsonAsync(results);

        const uploadDir = getAmazonBatchDir(batchId);
        
        const filesOnDisk = [];
        const possibleFiles = ["combined_match.pdf", "converted_zpl.pdf", "original_invoices.pdf", "unmatched_invoices.pdf", "unmatched_zpl.pdf"];
        for (const file of possibleFiles) {
          const filePath = path.join(uploadDir, file);
          if (fs.existsSync(filePath)) {
            filesOnDisk.push({
              fieldname: file.replace(".pdf", ""), // close enough for findFile
              filename: file,
              path: filePath
            });
          }
        }

        // Data Integrity Check
        const combinedExists = filesOnDisk.some(f => f.filename === "combined_match.pdf");
        if (!combinedExists && filesOnDisk.length > 0) {
           console.warn(`[AmazonBatch] combined_match.pdf missing for batch ${batchId}. DB insertion proceeding but files may be incomplete.`);
        }

        const batch = await saveBatchService({
          userId,
          summary,
          results,
          uploadedFiles: filesOnDisk,
          batchNumber,
          batchDate,
          baseUrl,
          batchId,
        });

        batchStatuses.set(batchId, { status: "completed", data: batch });
      } catch (error) {
        console.error("Background Processing Error:", error);
        batchStatuses.set(batchId, { status: "failed", error: error.message });
      }
    })();
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Status: Polling endpoint
 */
export const getBatchStatusController = (req, res, next) => {
  try {
    const { batchId } = req.params;
    const statusData = batchStatuses.get(batchId) || { status: "unknown" };
    res.status(200).json({ success: true, ...statusData });
  } catch (error) {
    next(error);
  }
};

