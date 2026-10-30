import fs from "fs";
import path from "path";

export const sanitizeFileName = (str) => {
  return String(str || "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "_");
};

/**
 * Returns the target storage directory on NAS for a given user and master SKU.
 * Format: <NAS_ROOT_PATH>/VMS/Product Img/<userName>/<masterSku>
 * If NAS_ROOT_PATH is inaccessible (e.g. dev environment), falls back to public/uploads/nas/...
 */
export const getProductImageDir = async (userName, masterSku) => {
  const cleanUser = sanitizeFileName(userName) || "default";
  const cleanSku = sanitizeFileName(masterSku) || "unknown_sku";

  const nasRoot = process.env.NAS_ROOT_PATH;
  if (nasRoot) {
    try {
      const nasTargetDir = path.resolve(nasRoot, "VMS", "Product Img", cleanUser, cleanSku);
      await fs.promises.mkdir(nasTargetDir, { recursive: true });
      return nasTargetDir;
    } catch (err) {
      console.warn(`[ProductImage] Primary NAS directory inaccessible (${err.message}). Using local storage fallback.`);
    }
  }

  const fallbackDir = path.resolve(process.cwd(), "public", "uploads", "nas", "VMS", "Product Img", cleanUser, cleanSku);
  await fs.promises.mkdir(fallbackDir, { recursive: true });
  return fallbackDir;
};

/**
 * Finds an existing image file for a given masterSku and color.
 * Searches across all user directories under VMS/Product Img/
 */
export const findProductImageFile = async (masterSku, color, preferredUserName = null) => {
  const cleanSku = sanitizeFileName(masterSku);
  const cleanColor = sanitizeFileName(color).toLowerCase();
  if (!cleanSku || !cleanColor) return null;

  const searchRoots = [];
  if (process.env.NAS_ROOT_PATH) {
    searchRoots.push(path.resolve(process.env.NAS_ROOT_PATH, "VMS", "Product Img"));
  }
  searchRoots.push(path.resolve(process.cwd(), "public", "uploads", "nas", "VMS", "Product Img"));

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
            const base = path.parse(f).name.toLowerCase();
            return base === cleanColor;
          });
          if (matched) return path.join(userSkuDir, matched);
        }
      }

      // 2. Scan all user directories under root
      const userDirs = await fs.promises.readdir(root, { withFileTypes: true });
      for (const dirent of userDirs) {
        if (!dirent.isDirectory()) continue;
        const skuDir = path.join(root, dirent.name, cleanSku);
        if (fs.existsSync(skuDir)) {
          const files = await fs.promises.readdir(skuDir);
          const matched = files.find((f) => {
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
  if (process.env.NAS_ROOT_PATH) {
    searchRoots.push(path.resolve(process.env.NAS_ROOT_PATH, "VMS", "Product Img"));
  }
  searchRoots.push(path.resolve(process.cwd(), "public", "uploads", "nas", "VMS", "Product Img"));

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
            if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"].includes(ext)) {
              const colorName = path.parse(f).name;
              if (!imagesByColor[colorName]) {
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

