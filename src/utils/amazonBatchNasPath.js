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
  const configuredPath =
    process.env.NAS_AMAZON_BATCHES_ROOT_PATH ||
    process.env.NAS_BATCHES_ROOT_PATH ||
    process.env.NAS_AMAZON_BATCH_PATH;

  if (configuredPath && configuredPath.trim() !== "") {
    return path.resolve(configuredPath.trim());
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

  if (!fs.existsSync(batchDir)) {
    fs.mkdirSync(batchDir, { recursive: true });
  }

  return batchDir;
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

  // 2. Check within the currently configured NAS root
  if (batchId) {
    try {
      const currentBatchDir = getAmazonBatchDir(batchId);
      const fileName = storedPath ? path.basename(storedPath) : defaultFileName;
      if (fileName) {
        const candidatePath = path.join(currentBatchDir, fileName);
        if (fs.existsSync(candidatePath)) {
          return candidatePath;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Check legacy public/uploads directory
  if (batchId) {
    const legacyDir = path.join(process.cwd(), "public", "uploads", "amazon-batches", batchId);
    const fileName = storedPath ? path.basename(storedPath) : defaultFileName;
    if (fileName) {
      const legacyCandidate = path.join(legacyDir, fileName);
      if (fs.existsSync(legacyCandidate)) {
        return legacyCandidate;
      }
    }
  }

  return storedPath;
};
