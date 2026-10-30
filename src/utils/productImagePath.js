import fs from "fs";
import path from "path";

/**
 * Canonical product image root on NAS.
 */
export const PRIMARY_PRODUCT_IMAGE_ROOT = "/mnt/qnap-vms/product-image";

/**
 * Supported image extensions for product images.
 */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
];

/**
 * Sanitizes a path segment (user name, SKU, color) to prevent directory traversal and invalid chars.
 */
export const sanitizeFileName = (str) => {
  return String(str || "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "_");
};

/**
 * Returns the root directory for product images on the NAS.
 * Always resolves to /mnt/qnap-vms/product-image.
 * Does NOT derive from NAS_ROOT_PATH.
 * Does NOT depend on NAS_PRODUCT_IMAGE_ROOT_PATH being changed or added to .env.
 */
export const getProductImageRoot = () => {
  const custom = process.env.NAS_PRODUCT_IMAGE_ROOT_PATH;
  if (custom && typeof custom === "string" && custom.trim().length > 0 && custom.trim() !== "undefined") {
    return custom.trim();
  }
  return PRIMARY_PRODUCT_IMAGE_ROOT;
};

/**
 * Returns the target storage directory on NAS for a given user and master SKU.
 * Format: /mnt/qnap-vms/product-image/<userName>/<masterSku>
 * If NAS directory is inaccessible (e.g. dev environment or unmounted NAS),
 * logs a clear warning and falls back to public/uploads/nas/product-image/...
 */
export const getProductImageDir = async (userName, masterSku) => {
  const cleanUser = sanitizeFileName(userName) || "default";
  const cleanSku = sanitizeFileName(masterSku) || "unknown_sku";

  const primaryRoot = getProductImageRoot();
  const nasTargetDir = path.resolve(primaryRoot, cleanUser, cleanSku);

  // Check if primary NAS root or its mount point is accessible before creating directory
  const mountBase = path.dirname(primaryRoot);
  const isNasMountAccessible = fs.existsSync(primaryRoot) || fs.existsSync(mountBase);

  if (isNasMountAccessible) {
    try {
      await fs.promises.mkdir(nasTargetDir, { recursive: true });
      await fs.promises.access(nasTargetDir, fs.constants.W_OK);
      return nasTargetDir;
    } catch (err) {
      console.warn(
        `[ProductImage] WARNING: Primary NAS directory "${nasTargetDir}" is inaccessible or failed (${err.message}). Using local storage fallback.`
      );
    }
  } else {
    console.warn(
      `[ProductImage] WARNING: Primary NAS root/mount "${primaryRoot}" is not accessible on this system. Using local storage fallback.`
    );
  }

  // Local fallback storage (only when primary NAS is unavailable/inaccessible)
  const fallbackDir = path.resolve(process.cwd(), "public", "uploads", "nas", "product-image", cleanUser, cleanSku);
  await fs.promises.mkdir(fallbackDir, { recursive: true });
  console.warn(
    `[ProductImage] NOTE: Using local fallback path: "${fallbackDir}". Files saved here are NOT on the production NAS!`
  );
  return fallbackDir;
};

/**
 * Finds an existing image file for a given masterSku and color.
 * Searches primary NAS location under /mnt/qnap-vms/product-image first,
 * then checks local fallback if needed.
 */
export const findProductImageFile = async (masterSku, color, preferredUserName = null) => {
  const cleanSku = sanitizeFileName(masterSku);
  const cleanColor = sanitizeFileName(color).toLowerCase();
  if (!cleanSku || !cleanColor) return null;

  const searchRoots = [];
  const primaryRoot = getProductImageRoot();
  if (primaryRoot) {
    searchRoots.push(primaryRoot);
  }
  searchRoots.push(path.resolve(process.cwd(), "public", "uploads", "nas", "product-image"));

  for (const root of searchRoots) {
    try {
      if (!fs.existsSync(root)) continue;

      // 1. Check preferred user first if provided
      if (preferredUserName) {
        const cleanUser = sanitizeFileName(preferredUserName);
        const userSkuDir = path.join(root, cleanUser, cleanSku);
        if (fs.existsSync(userSkuDir)) {
          const files = await fs.promises.readdir(userSkuDir);
          const matched = files.find((f) => {
            const ext = path.extname(f).toLowerCase();
            if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) return false;
            const base = path.parse(f).name.toLowerCase();
            return base === cleanColor;
          });
          if (matched) return path.join(userSkuDir, matched);
        }
      }

      // 2. Scan all user directories under root (cross-user lookup)
      const userDirs = await fs.promises.readdir(root, { withFileTypes: true });
      for (const dirent of userDirs) {
        if (!dirent.isDirectory()) continue;
        const skuDir = path.join(root, dirent.name, cleanSku);
        if (fs.existsSync(skuDir)) {
          const files = await fs.promises.readdir(skuDir);
          const matched = files.find((f) => {
            const ext = path.extname(f).toLowerCase();
            if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) return false;
            const base = path.parse(f).name.toLowerCase();
            return base === cleanColor;
          });
          if (matched) return path.join(skuDir, matched);
        }
      }
    } catch {
      // Continue searching next root
    }
  }

  return null;
};

/**
 * Finds all product images for a given masterSku across all users.
 * Returns an object mapping colorName => file info
 */
export const findAllProductImagesForSku = async (masterSku) => {
  const cleanSku = sanitizeFileName(masterSku);
  if (!cleanSku) return {};

  const imagesByColor = {};
  const searchRoots = [];
  const primaryRoot = getProductImageRoot();
  if (primaryRoot) {
    searchRoots.push(primaryRoot);
  }
  searchRoots.push(path.resolve(process.cwd(), "public", "uploads", "nas", "product-image"));

  for (const root of searchRoots) {
    try {
      if (!fs.existsSync(root)) continue;
      const userDirs = await fs.promises.readdir(root, { withFileTypes: true });
      for (const dirent of userDirs) {
        if (!dirent.isDirectory()) continue;
        const skuDir = path.join(root, dirent.name, cleanSku);
        if (fs.existsSync(skuDir)) {
          const files = await fs.promises.readdir(skuDir);
          for (const f of files) {
            const ext = path.extname(f).toLowerCase();
            if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
              const colorName = path.parse(f).name;
              // Avoid duplicate colors (case-insensitively check)
              const existingKey = Object.keys(imagesByColor).find(
                (k) => k.toLowerCase() === colorName.toLowerCase()
              );
              if (!existingKey) {
                imagesByColor[colorName] = {
                  fileName: f,
                  color: colorName,
                  filePath: path.join(skuDir, f),
                };
              }
            }
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return imagesByColor;
};
