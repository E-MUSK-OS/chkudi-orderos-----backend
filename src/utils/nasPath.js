import path from "path";

export const buildRecordingPath = (year, month, day, userName, accountName, operatorName, cameraName, trackingId, formattedDateTime) => {
  const nasRoot = process.env.NAS_ROOT_PATH;
  if (!nasRoot) throw new Error("NAS_ROOT_PATH is not configured");

  const sanitize = (str) => String(str).replace(/[^a-zA-Z0-9-_]/g, "");

  const relativePath = path.join(
    "VMS",
    sanitize(year),
    sanitize(month),
    sanitize(day),
    sanitize(userName),
    sanitize(accountName || "default"),
    sanitize(operatorName || "default"),
    sanitize(cameraName || "default"),
    "video",
    `${sanitize(trackingId)}_${sanitize(formattedDateTime)}.mp4`
  );

  const absolutePath = path.resolve(nasRoot, relativePath);

  // Security: Prevent directory traversal outside of NAS_ROOT_PATH
  if (!absolutePath.startsWith(path.resolve(nasRoot))) {
    throw new Error("Path traversal violation detected");
  }

  return absolutePath;
};

export const buildThumbnailPath = (year, month, day, userName, accountName, operatorName, cameraName, trackingId, formattedDateTime) => {
  const nasRoot = process.env.NAS_ROOT_PATH;
  if (!nasRoot) throw new Error("NAS_ROOT_PATH is not configured");

  const sanitize = (str) => String(str).replace(/[^a-zA-Z0-9-_]/g, "");

  const relativePath = path.join(
    "VMS",
    sanitize(year),
    sanitize(month),
    sanitize(day),
    sanitize(userName),
    sanitize(accountName || "default"),
    sanitize(operatorName || "default"),
    sanitize(cameraName || "default"),
    "thumbnail",
    `${sanitize(trackingId)}_${sanitize(formattedDateTime)}.jpg`
  );

  const absolutePath = path.resolve(nasRoot, relativePath);

  // Security: Prevent directory traversal outside of NAS_ROOT_PATH
  if (!absolutePath.startsWith(path.resolve(nasRoot))) {
    throw new Error("Path traversal violation detected");
  }

  return absolutePath;
};
