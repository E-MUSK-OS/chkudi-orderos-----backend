import path from "path";
import fs from "fs";

/**
 * Returns the configured NAS root directory for User Profile Images.
 * Uses strictly NAS_USER_PROFILE_IMAGE_ROOT_PATH with default /mnt/qnap-vms/user-profile-image
 */
export const getUserProfileImageRootDir = () => {
  const isLocalWindows = process.platform === "win32";

  const configuredPath =
    process.env.NAS_USER_PROFILE_IMAGE_ROOT_PATH ||
    "/mnt/qnap-vms/user-profile-image";

  if (configuredPath && configuredPath.trim() !== "") {
    const trimmed = configuredPath.trim();

    // On local Windows development: if the configured path is a Linux mount (e.g. /mnt/qnap-vms/...)
    // or unreachable network path, keep local development completely local inside public/uploads
    if (isLocalWindows && (trimmed.startsWith("/") || !fs.existsSync(trimmed))) {
      return path.resolve(process.cwd(), "public", "uploads", "user-profile-image");
    }

    return path.resolve(trimmed);
  }

  return path.resolve(process.cwd(), "public", "uploads", "user-profile-image");
};

/**
 * Returns and ensures the folder for a specific user's profile image inside the NAS root.
 * Subfolder name format: <FirstName>_<MiddleName>_<LastName> (or clean combination)
 */
export const getUserProfileFolderDir = (folderName) => {
  const safeName = String(folderName || "default_user")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim();

  const rootDir = getUserProfileImageRootDir();
  const userDir = path.join(rootDir, safeName);

  try {
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  } catch (err) {
    if (err.code !== "EEXIST") {
      console.warn(`[UserProfile NAS] Failed to access/create NAS directory (${userDir}): ${err.message}. Using fallback.`);
    } else {
      return userDir;
    }

    // Fallback: Local project uploads directory
    const localDir = path.resolve(process.cwd(), "public", "uploads", "user-profile-image", safeName);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  }
};
