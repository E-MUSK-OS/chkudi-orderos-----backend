import {
  saveBatchService,
  getBatchHistoryService,
  getBatchByIdService,
  getBatchFilePathService,
  deleteAmazonBatchService,
} from "../services/amazonBatch.service.js";

/**
 * Save newly processed Amazon batch
 * POST /api/v1/amazon-orders/batches
 */
export const saveBatchController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { summary, results, batchNumber, batchDate, files } = req.body;

    // Parse JSON fields if received as string from FormData
    if (typeof summary === "string") {
      try {
        summary = JSON.parse(summary);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid summary JSON format" });
      }
    }

    if (typeof results === "string") {
      try {
        results = JSON.parse(results);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid results JSON format" });
      }
    }

    if (typeof files === "string") {
      try {
        files = JSON.parse(files);
      } catch (e) {
        // ignore if not JSON
      }
    }

    const host = req.get("host");
    const protocol = req.protocol || "http";
    const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;

    const batch = await saveBatchService({
      userId,
      summary,
      results,
      uploadedFiles: req.files,
      base64Files: files,
      batchNumber,
      batchDate,
      baseUrl,
      batchId: req.batchId,
    });

    res.status(201).json({
      success: true,
      message: "Amazon batch saved to 7-day history database successfully.",
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active Amazon batches for the last 7 days
 * GET /api/v1/amazon-orders/batches/history
 */
export const getBatchHistoryController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const batches = await getBatchHistoryService(userId, Number(days));

    res.status(200).json({
      success: true,
      data: batches,
      count: batches.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full batch details by ID
 * GET /api/v1/amazon-orders/batches/:id
 */
export const getBatchByIdController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const batch = await getBatchByIdService(userId, id);

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream/Download a specific batch PDF file (combined, zpl, original)
 * GET /api/v1/amazon-orders/batches/:id/files/:fileType
 */
export const serveBatchFileController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, fileType } = req.params;

    const { filePath, fileName } = await getBatchFilePathService(userId, id, fileType);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific batch and its associated printed orders
 * DELETE /api/v1/amazon-orders/batches/:id
 */
export const deleteBatchController = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await deleteAmazonBatchService(userId, id);

    res.status(200).json({
      success: true,
      message: "Amazon batch and associated orders deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

