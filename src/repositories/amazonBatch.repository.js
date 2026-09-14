import prisma from "../config/prisma.js";
import fs from "fs";
import path from "path";
import { getAmazonBatchDir } from "../utils/amazonBatchNasPath.js";

/**
 * Convert any date to India Standard Time (IST, UTC+05:30) representation
 * so PostgreSQL timestamp without time zone stores the actual local Indian time.
 */
export const getIstDate = (date = new Date()) => {
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  return new Date(date.getTime() + istOffsetMs);
};

/**
 * Calculate expiration timestamp: 6:00 PM (18:00:00.000) on the 7th day in IST.
 * Stored into PostgreSQL as literal 18:00:00 on the 7th day.
 * Example: if created on Sept 14 (at any time), 7th day is Sept 21 at 18:00:00.
 */
export const calculateSeventhDay6Pm = (createdAt = new Date()) => {
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istNow = new Date(createdAt.getTime() + istOffsetMs);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const day = istNow.getUTCDate() + 7;
  return new Date(Date.UTC(year, month, day, 18, 0, 0, 0));
};

/**
 * Save a newly processed Amazon batch
 */
export const createAmazonProcessBatch = async ({
  userId,
  batchNumber,
  batchDate,
  summary,
  results,
  fileUrls = {},
  filePaths = {},
}) => {
  const now = new Date();
  const istNow = getIstDate(now);
  const expiresAt = calculateSeventhDay6Pm(now);

  const totalOrders = Number(summary?.totalZplLabels || summary?.totalPdfOrders || (Array.isArray(results) ? results.length : 0));
  const matchedCount = Number(summary?.matchedCount || 0);
  const mismatchCount = Number(summary?.mismatchCount || 0);
  const matchPercentage = Number(summary?.matchPercentage || 0);

  const created = await prisma.amazonProcessBatch.create({
    data: {
      userId,
      batchNumber: batchNumber || `BATCH-${istNow.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
      batchDate: batchDate ? getIstDate(new Date(batchDate)) : istNow,
      totalOrders,
      matchedCount,
      mismatchCount,
      matchPercentage,
      pdfFileName: summary?.pdfFileName || null,
      zplFileName: summary?.zplFileName || null,
      summary: summary || {},
      results: Array.isArray(results) ? results : [],
      combinedPdfPath: filePaths.combinedPdfPath || null,
      combinedPdfUrl: fileUrls.combinedPdfUrl || null,
      zplPdfPath: filePaths.zplPdfPath || null,
      zplPdfUrl: fileUrls.zplPdfUrl || null,
      originalPdfPath: filePaths.originalPdfPath || null,
      originalPdfUrl: fileUrls.originalPdfUrl || null,
      unmatchedPdfPath: filePaths.unmatchedPdfPath || null,
      unmatchedPdfUrl: fileUrls.unmatchedPdfUrl || null,
      unmatchedZplPdfPath: filePaths.unmatchedZplPdfPath || null,
      unmatchedZplPdfUrl: fileUrls.unmatchedZplPdfUrl || null,
      createdAt: istNow,
      updatedAt: istNow,
      expiresAt,
    },
  });

  return created;
};

/**
 * Get Amazon batches history for the last 7 days (active until 6:00 PM on 7th day)
 */
export const getAmazonProcessBatchesHistory = async (userId, days = 7) => {
  const istNow = getIstDate(new Date());

  const batches = await prisma.amazonProcessBatch.findMany({
    where: {
      userId,
      expiresAt: { gt: istNow },
    },
    select: {
      id: true,
      batchNumber: true,
      batchDate: true,
      totalOrders: true,
      matchedCount: true,
      mismatchCount: true,
      matchPercentage: true,
      pdfFileName: true,
      zplFileName: true,
      combinedPdfUrl: true,
      zplPdfUrl: true,
      originalPdfUrl: true,
      unmatchedPdfUrl: true,
      unmatchedZplPdfUrl: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return batches;
};

/**
 * Get full Amazon batch data by ID (summary, results, file URLs)
 */
export const getAmazonProcessBatchById = async (userId, batchId) => {
  const batch = await prisma.amazonProcessBatch.findFirst({
    where: {
      id: batchId,
      userId,
    },
  });

  return batch;
};

/**
 * Delete expired batches (older than 6:00 PM on 7th day) and clean physical files
 */
export const deleteExpiredAmazonProcessBatches = async () => {
  const istNow = getIstDate(new Date());

  // 1. Find all expired batches
  const expiredBatches = await prisma.amazonProcessBatch.findMany({
    where: {
      expiresAt: { lte: istNow },
    },
    select: {
      id: true,
      combinedPdfPath: true,
      zplPdfPath: true,
      originalPdfPath: true,
      unmatchedPdfPath: true,
      unmatchedZplPdfPath: true,
    },
  });

  if (!expiredBatches || expiredBatches.length === 0) {
    return { count: 0 };
  }

  // 2. Delete physical directories from filesystem (NAS root and legacy local paths)
  for (const batch of expiredBatches) {
    const candidateDirs = new Set();
    try {
      candidateDirs.add(getAmazonBatchDir(batch.id));
    } catch (e) {}
    candidateDirs.add(path.join(process.cwd(), "public", "uploads", "amazon-batches", batch.id));
    if (batch.combinedPdfPath) {
      candidateDirs.add(path.dirname(batch.combinedPdfPath));
    }

    for (const dir of candidateDirs) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`[AmazonBatch Cleanup] Deleted folder: ${dir}`);
        }
      } catch (e) {
        console.warn(`[AmazonBatch Cleanup] Failed to delete folder ${dir} for batch ${batch.id}:`, e);
      }
    }
  }

  // 3. Delete database records
  const result = await prisma.amazonProcessBatch.deleteMany({
    where: {
      expiresAt: { lte: istNow },
    },
  });

  return result;
};
