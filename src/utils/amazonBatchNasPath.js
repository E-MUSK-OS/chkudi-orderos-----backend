import path from "path";
import fs from "fs";

/**
 * Returns the configured NAS root directory for Amazon batches.
 * Priority:
 * 1. NAS_AMAZON_BATCHES_ROOT_PATH
 * 2. NAS_BATCHES_ROOT_PATH
 * 3. NAS_AMAZON_BATCH_PATH
 * 4. Fallback: <project_root>/public/uploads/amazon-batches
 */
export const getAmazonBatchRootDir = () => {
  const isLocalWindows = process.platform === "win32";

  const configuredPath =
    process.env.NAS_AMAZON_BATCHES_ROOT_PATH ||
    process.env.NAS_BATCHES_ROOT_PATH ||
    process.env.NAS_AMAZON_BATCH_PATH;

  if (configuredPath && configuredPath.trim() !== "") {
    const trimmed = configuredPath.trim();

    // On local Windows development: if the configured path is a Linux mount (like /data/amazon-batches or /amazon-batches)
    // or an unreachable network path, keep local development completely local inside public/uploads
    if (isLocalWindows && (trimmed.startsWith("/") || !fs.existsSync(trimmed))) {
      return path.resolve(process.cwd(), "public", "uploads", "amazon-batches");
    }

    return path.resolve(trimmed);
  }

  // Fallback to local uploads directory if NAS path is not set
  return path.resolve(process.cwd(), "public", "uploads", "amazon-batches");
};

/**
 * Returns and ensures the folder for a specific batch inside the NAS Amazon batches root.
 * E.g., /amazon-batches/<batchId> or D:\amazon-batches\<batchId>
 */
export const getAmazonBatchDir = (batchId) => {
  if (!batchId) {
    throw new Error("batchId is required to resolve batch directory");
  }

  const safeBatchId = String(batchId).replace(/[^a-zA-Z0-9_-]/g, "");
  const rootDir = getAmazonBatchRootDir();
  const batchDir = path.join(rootDir, safeBatchId);

  try {
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true });
    }
    return batchDir;
  } catch (err) {
    console.warn(`[AmazonBatch NAS] Failed to access/create NAS directory (${batchDir}): ${err.message}. Using fallback.`);
    
    // Tier 1 Fallback: Check D:\amazon-batches (if local Windows D: drive exists)
    try {
      const driveDFallback = path.join("D:\\amazon-batches", safeBatchId);
      if (!fs.existsSync(driveDFallback)) {
        fs.mkdirSync(driveDFallback, { recursive: true });
      }
      return driveDFallback;
    } catch (e) {
      // Tier 2 Fallback: Local project uploads directory
      const localDir = path.resolve(process.cwd(), "public", "uploads", "amazon-batches", safeBatchId);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      return localDir;
    }
  }
};

/**
 * Helper to resolve a batch file path, checking its existence and providing
 * a graceful fallback if the NAS mount root differs between environments.
 */
export const resolveBatchFilePath = (storedPath, batchId, defaultFileName) => {
  // 1. Direct check of stored path
  if (storedPath && fs.existsSync(storedPath)) {
    return storedPath;
  }

  const safeBatchId = batchId ? String(batchId).replace(/[^a-zA-Z0-9_-]/g, "") : "";
  const fileName = storedPath ? path.basename(storedPath) : defaultFileName;

  if (safeBatchId && fileName) {
    // 2. Check within the currently configured NAS root
    try {
      const rootDir = getAmazonBatchRootDir();
      const candidatePath = path.join(rootDir, safeBatchId, fileName);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    } catch (e) {}

    // 3. Check D:\amazon-batches (where previous batches were stored)
    try {
      const driveDCandidate = path.join("D:\\amazon-batches", safeBatchId, fileName);
      if (fs.existsSync(driveDCandidate)) {
        return driveDCandidate;
      }
    } catch (e) {}

    // 4. Check legacy project public/uploads directory
    try {
      const legacyCandidate = path.join(process.cwd(), "public", "uploads", "amazon-batches", safeBatchId, fileName);
      if (fs.existsSync(legacyCandidate)) {
        return legacyCandidate;
      }
    } catch (e) {}
  }

  return storedPath;
};
