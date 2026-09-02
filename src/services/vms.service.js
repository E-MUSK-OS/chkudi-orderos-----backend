import {
  createScan,
  getScanById,
  getScanByTrackingId,
  updateScan,
  getAllScans,
  getScanCount,
  deleteScan,
  createUploadedScan,
  getUserVMS,
  updatePackingScanStatus,
  getPackingScanByTrackingId,
  getUserById,
  getAccountById,
  getOperatorById,
} from "../repositories/vms.repository.js";
export const createScanService = async (data) => {
  return await createScan(data);
};

export const getScanByIdService = async (id) => {
  return await getScanById(id);
};

export const getScanByTrackingIdService = async (trackingId) => {
  return await getScanByTrackingId(trackingId);
};

export const updateScanService = async (id, data) => {
  return await updateScan(id, data);
};

export const deleteScanService = async (id) => {
  const scan = await getScanById(id);
  if (!scan) {
    throw new Error("Scan not found.");
  }

  // Delete files from NAS if they exist
  if (scan.filePath) {
    try { await fs.unlink(scan.filePath); } catch (e) { /* ignore if not found */ }
  }
  if (scan.thumbnailPath) {
    try { await fs.unlink(scan.thumbnailPath); } catch (e) { /* ignore if not found */ }
  }

  return await deleteScan(id);
};

export const getAllScansService = async ({ page = 1, limit = 20 }) => {
  const scans = await getAllScans({
    page,
    limit,
  });

  const total = await getScanCount();

  return {
    scans,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

import fs from "fs/promises";
import path from "path";
import { buildRecordingPath } from "../utils/nasPath.js";
import { generateVideoThumbnail } from "../utils/videoThumbnail.js";

export const uploadRecordingService = async ({
  trackingId,
  userId,
  file,
  operatorId,
  accountId,
  cameraName,
}) => {
  if (!file) {
    throw new Error("Video file is required.");
  }
  
  if (!operatorId || operatorId === "null" || operatorId === "undefined") {
    throw new Error("Operator ID is required to upload recording.");
  }

  if (!accountId || accountId === "null" || accountId === "undefined") {
    throw new Error("Account ID is required to upload recording.");
  }

  // Always create a new scan record for each upload
  // This ensures we don't overwrite existing completed recordings

  // Check if there's an existing scan with this trackingId
  const existing = await getScanByTrackingId(trackingId);

  if (existing) {
    // Delete files from NAS if they exist
    if (existing.filePath) {
      try { await fs.unlink(existing.filePath); } catch (e) { /* ignore if not found */ }
    }
    if (existing.thumbnailPath) {
      try { await fs.unlink(existing.thumbnailPath); } catch (e) { /* ignore if not found */ }
    }
    // Delete the old record from DB
    await deleteScan(existing.id);
  }

  // Helper to handle form-data strings like "null" or "undefined" or ""
  const sanitizeFk = (id) => (!id || id === "null" || id === "undefined" || id.trim() === "") ? null : id;

  const cleanOperatorId = sanitizeFk(operatorId);
  const cleanAccountId = sanitizeFk(accountId);

  // Create a new record for each upload attempt
  const scan = await createUploadedScan({
    trackingId,
    userId,
    status: "PENDING",
    operatorId: cleanOperatorId,
    accountId: cleanAccountId,
    cameraName: cameraName || null,
  });

  let videoPath;
  try {
    const date = new Date();
    
    // Fetch user details to get the name instead of the ID
    const user = await getUserById(userId);
    const folderName = user && user.fullName ? user.fullName : userId;

    let accountName = "default";
    if (cleanAccountId) {
      const account = await getAccountById(cleanAccountId);
      if (account && account.accountName) {
        accountName = account.accountName;
      }
    }

    let operatorName = "default";
    if (cleanOperatorId) {
      const operator = await getOperatorById(cleanOperatorId);
      if (operator && operator.operatorName) {
        operatorName = operator.operatorName;
      }
    }

    const pad = (n) => n.toString().padStart(2, "0");
    const formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const formattedTime = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
    const formattedDateTime = `${formattedDate}_${formattedTime}`;

    videoPath = buildRecordingPath(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      folderName,
      accountName,
      operatorName,
      cameraName || "default",
      trackingId,
      formattedDateTime
    );

    await fs.mkdir(path.dirname(videoPath), { recursive: true });
    await fs.writeFile(videoPath, file.buffer);

    const thumbnailPath = videoPath.replace(".mp4", ".jpg");
    const generatedThumbnail = await generateVideoThumbnail(videoPath, thumbnailPath);

    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const videoUrl = `${baseUrl}/api/v1/vms/media/${scan.id}/video`;
    const thumbnailUrl = `${baseUrl}/api/v1/vms/media/${scan.id}/thumbnail`;

    // Update the scan with NAS details
    const updatedScan = await updateScan(scan.id, {
      status: "COMPLETED",
      filePath: videoPath,
      thumbnailPath: generatedThumbnail,
      videoUrl: videoUrl,
      thumbnailUrl: thumbnailUrl,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date(),
      operatorId: cleanOperatorId,
      accountId: cleanAccountId,
      cameraName: cameraName || null,
    });

    return await getScanById(scan.id);
  } catch (error) {
    // Update status to FAILED
    await updateScan(scan.id, {
      status: "FAILED",
    });

    if (videoPath) {
      try { await fs.unlink(videoPath); } catch (e) { /* best effort */ }
    }

    throw error;
  }
};

// export const saveRecordingService = async ({
//   trackingId,
//   userId,
//   videoUrl,
//   thumbnailUrl,
//   duration,
//   bytes,
//   publicId,
//   version,
//   operatorId,
//   accountId,
//   cameraName,
// }) => {
//   const existingScan = await getScanByTrackingId(trackingId);

//   if (existingScan && existingScan.status === "COMPLETED") {
//     const newScan = await createUploadedScan({
//       trackingId,
//       userId,
//       status: "COMPLETED",
//       videoUrl,
//       thumbnailUrl,
//       duration: duration ? Math.round(duration) : null,
//       fileSize: bytes,
//       publicId,
//       version,
//       uploadedAt: new Date(),
//       operatorId: operatorId || null,
//       accountId: accountId || null,
//       cameraName: cameraName || null,
//     });
//     return newScan;
//   }
//   if (existingScan && existingScan.status !== "COMPLETED") {
//     if (existingScan.publicId) {
//       try {
//         await deleteVideoFromCloudinary(existingScan.publicId);
//       } catch (error) {
//         console.error("Failed to delete old video:", error);
//       }
//     }

//     const updatedScan = await updateScan(existingScan.id, {
//       userId,
//       status: "COMPLETED",
//       videoUrl,
//       thumbnailUrl,
//       duration: duration ? Math.round(duration) : null,
//       fileSize: bytes,
//       publicId,
//       version,
//       uploadedAt: new Date(),
//       operatorId: operatorId || null,
//       accountId: accountId || null,
//       cameraName: cameraName || null,
//     });
//     return updatedScan;
//   }

//   const newScan = await createUploadedScan({
//     trackingId,
//     userId,
//     status: "COMPLETED",
//     videoUrl,
//     thumbnailUrl,
//     duration: duration ? Math.round(duration) : null,
//     fileSize: bytes,
//     publicId,
//     version,
//     uploadedAt: new Date(),
//     operatorId: operatorId || null,
//     accountId: accountId || null,
//     cameraName: cameraName || null,
//   });
//   return newScan;
// };

// Deleted saveRecordingService

export const getUserVMSService = async (userId) => {
  return await getUserVMS(userId);
};

export const updatePackingScanStatusService = async ({
  trackingId,
  userId,
}) => {

  const scan = await getPackingScanByTrackingId({
    trackingId,
    userId,
  });

  if (!scan) {
    return {
      success: false,
      message: "Tracking ID not found.",
    };
  }

  if (scan.packingScanStatus === "SCANNED") {
    return {
      success: false,
      message: "Tracking ID already scanned.",
    };
  }

  const updatedScan = await updatePackingScanStatus({
    id: scan.id,
  });

  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("tracking:updated", {
      trackingId,
      userId,
      scanId: updatedScan.id,
      packingScanStatus: updatedScan.packingScanStatus,
    });

    console.log(`📦 Tracking update sent to user:${userId} - ${trackingId}`);
  } catch (error) {
    console.error("❌ Tracking socket event failed:", error);
  }

  return {
    success: true,
    message: "Tracking scanned successfully.",
    data: updatedScan,
  };
};


// export const updatePackingScanStatusService = async ({
//   trackingId,
//   userId,
// }) => {
//   // 1. Tracking ID શોધો
//   const scan = await getPackingScanByTrackingId({
//     trackingId,
//     userId,
//   });

//   if (!scan) {
//     return {
//       success: false,
//       message: "Tracking ID not found.",
//     };
//   }

//   // 2. Already scanned check
//   if (scan.packingScanStatus === "SCANNED") {
//     return {
//       success: false,
//       message: "Tracking ID already scanned.",
//     };
//   }

//   // 3. Database update
//   const updatedScan = await updatePackingScanStatus({
//     id: scan.id,
//   });

//   // =====================================
//   // 4. SOCKET EVENT
//   // =====================================

//   const io = getIO();

//   io.to(`user:${userId}`).emit("tracking:updated", {
//     trackingId: updatedScan.trackingId,
//     userId: updatedScan.userId,
//     scanId: updatedScan.id,
//     packingScanStatus: updatedScan.packingScanStatus,
//   });

//   console.log("📦 Tracking update emitted:", {
//     trackingId: updatedScan.trackingId,
//     userId: updatedScan.userId,
//     scanId: updatedScan.id,
//     packingScanStatus: updatedScan.packingScanStatus,
//   });

//   return {
//     success: true,
//     message: "Tracking scanned successfully.",
//   };
// };