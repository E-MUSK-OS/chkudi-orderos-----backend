import path from "path";
import fs from "fs";

/**
 * Returns the configured NAS/disk root directory for Company Media
 * (Company Profile logos/signatures, Employee Profile photos/documents, Ledger Book logos).
 * Priority:
 * 1. NAS_COMPANY_MEDIA_ROOT_PATH
 * 2. NAS_MEDIA_ROOT_PATH
 * 3. NAS_ROOT_PATH/company-media
 * 4. Fallback: <project_root>/public/uploads/company-media
 */
export const getCompanyMediaRootDir = () => {
  const isLocalWindows = process.platform === "win32";

  const configuredPath =
    process.env.NAS_COMPANY_MEDIA_ROOT_PATH ||
    process.env.NAS_MEDIA_ROOT_PATH ||
    (process.env.NAS_ROOT_PATH ? path.join(process.env.NAS_ROOT_PATH, "company-media") : null);

  if (configuredPath && configuredPath.trim() !== "") {
    const trimmed = configuredPath.trim();

    // On local Windows development: if the configured path is a Linux mount (like /mnt/qnap-vms/...)
    // or an unreachable path, gracefully fall back to local public/uploads/company-media
    if (isLocalWindows && (trimmed.startsWith("/") || !fs.existsSync(trimmed))) {
      const localFallback = path.resolve(process.cwd(), "public", "uploads", "company-media");
      if (!fs.existsSync(localFallback)) {
        fs.mkdirSync(localFallback, { recursive: true });
      }
      return localFallback;
    }

    const resolved = path.resolve(trimmed);
    try {
      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }
      return resolved;
    } catch (e) {
      console.warn(`[CompanyMedia NAS] Failed to access/create NAS directory (${resolved}): ${e.message}. Using local fallback.`);
    }
  }

  // Fallback to local uploads directory
  const localDir = path.resolve(process.cwd(), "public", "uploads", "company-media");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
};

/**
 * Returns and ensures the folder for a specific media subfolder exists.
 * E.g., 'employees', 'company', 'ledger'
 */
export const getCompanyMediaSubDir = (subfolder = "general") => {
  const root = getCompanyMediaRootDir();
  const safeSubfolder = String(subfolder || "general").replace(/[^a-zA-Z0-9_-]/g, "");
  const targetDir = path.join(root, safeSubfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

/**
 * If dataString is a Base64 data URI (e.g. data:image/png;base64,...),
 * saves it to the NAS/media storage and returns its served URL path.
 * If dataString is already a URL or empty/null, returns it untouched.
 */
export const saveBase64Media = async (dataString, subfolder = "general", prefix = "media") => {
  if (!dataString || typeof dataString !== "string") {
    return dataString;
  }

  const trimmed = dataString.trim();

  // If already a URL or relative path, don't re-save
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/uploads/") ||
    trimmed.startsWith("/api/")
  ) {
    return trimmed;
  }

  // Check if it's a base64 data URI
  const match = trimmed.match(/^data:([A-Za-z0-9\-+\/]+);base64,(.+)$/s);
  if (!match) {
    return dataString;
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];

  let ext = ".png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = ".jpg";
  else if (mimeType.includes("webp")) ext = ".webp";
  else if (mimeType.includes("gif")) ext = ".gif";
  else if (mimeType.includes("svg")) ext = ".svg";
  else if (mimeType.includes("pdf")) ext = ".pdf";

  const safePrefix = String(prefix || "media").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeSubfolder = String(subfolder || "general").replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

  const targetDir = getCompanyMediaSubDir(safeSubfolder);
  const filePath = path.join(targetDir, fileName);

  const buffer = Buffer.from(base64Data, "base64");
  await fs.promises.writeFile(filePath, buffer);

  return `/uploads/company-media/${safeSubfolder}/${fileName}`;
};

/**
 * Saves a file buffer (e.g. from multer) to NAS/media storage and returns the served URL path.
 */
export const saveBufferMedia = async (buffer, originalname, subfolder = "general", prefix = "media") => {
  const ext = originalname ? path.extname(originalname) : ".png";
  const safePrefix = String(prefix || "media").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeSubfolder = String(subfolder || "general").replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

  const targetDir = getCompanyMediaSubDir(safeSubfolder);
  const filePath = path.join(targetDir, fileName);

  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/company-media/${safeSubfolder}/${fileName}`;
};

