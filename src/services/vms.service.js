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
} from "../repositories/vms.repository.js";
import { uploadVideoToCloudinary } from "../utils/cloudinaryUpload.js";
import { generateThumbnailUrl } from "../utils/generateThumbnail.js";
import { generateUploadSignature } from "../utils/cloudinarySignature.js";
import { deleteVideoFromCloudinary } from "../utils/cloudinaryDelete.js";
import cloudinary from "../config/cloudinary.js";
import { deductWalletPoints } from "./wallet.service.js";
import { getIO } from "../socket/socket.js";

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

// export const deleteScanService = async (id) => {
//   return await deleteScan(id);
// };

export const deleteScanService = async (id) => {
  // 1. ડિલીટ કરતા પહેલા Database માંથી scan ની માહિતી લો
  const scan = await getScanById(id);

  if (!scan) {
    throw new Error("Scan not found.");
  }

  // 2. જો Cloudinary publicId હોય, તો Cloudinary માંથી વિડિયો ડિલીટ કરો
  if (scan.publicId) {
    try {
      await deleteVideoFromCloudinary(scan.publicId);
    } catch (error) {
      console.error("Failed to delete video from Cloudinary:", error);
    }
  }

  // 3. હવે Database માંથી record ડિલીટ કરો
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

// export const uploadRecordingService = async ({
//   trackingId,
//   file,
//   operatorId,
//   cameraName,
// }) => {
//   return {
//     success: true,
//     trackingId,
//     file,
//     operatorId,
//     cameraName,
//   };
// };

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

  // Always create a new scan record for each upload
  // This ensures we don't overwrite existing completed recordings

  // Check if there's an existing scan with this trackingId
  const existing = await getScanByTrackingId(trackingId);

  // Create a new record for each upload attempt
  // Even if the trackingId exists, we create a new entry
  // This preserves history
  const scan = await createUploadedScan({
    trackingId,
    userId,
    status: "PENDING",
    operatorId: operatorId || null,
    accountId: accountId || null,
    cameraName: cameraName || null,
  });

  try {
    // Upload to Cloudinary
    const cloudinaryResult = await uploadVideoToCloudinary(
      file.buffer,
      `${trackingId}_${Date.now()}`, // Add timestamp to make publicId unique
    );

    const thumbnailUrl = generateThumbnailUrl(cloudinaryResult.secure_url);

    // Update the scan with Cloudinary details
    const updatedScan = await updateScan(scan.id, {
      status: "COMPLETED",
      videoUrl: cloudinaryResult.secure_url,
      thumbnailUrl,
      fileName: file.originalname,
      fileSize: file.size,
      duration: cloudinaryResult.duration
        ? Math.round(cloudinaryResult.duration)
        : null,
      publicId: cloudinaryResult.public_id,
      version: cloudinaryResult.version,
      uploadedAt: new Date(),
      operatorId: operatorId || null,
      accountId: accountId || null,
      cameraName: cameraName || null,
    });

    // await deductWalletPoints({
    //   userId,
    //   points: 2,
    //   description: "VMS Scan Charge",
    //   referenceId: trackingId,
    // });

    return await getScanById(scan.id);

    return await getScanById(scan.id);
  } catch (error) {
    // Update status to FAILED
    await updateScan(scan.id, {
      status: "FAILED",
    });

    throw error;
  }
};

// export const getUploadSignatureService = async () => {
//   return generateUploadSignature();
// };

export const getUploadSignatureService = async (publicId) => {
  const timestamp = Math.round(Date.now() / 1000);

  // Public ID with timestamp for uniqueness
  const uniquePublicId = `${publicId}_${timestamp}`;

  const params = {
    timestamp: timestamp,
    folder: "vms-recordings",
    public_id: uniquePublicId,
    overwrite: false,
  };

  // Generate signature with ALL parameters
  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET,
  );

  return {
    timestamp: timestamp,
    folder: "vms-recordings",
    publicId: uniquePublicId,
    overwrite: false,
    signature: signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
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

export const saveRecordingService = async ({
  trackingId,
  userId,
  videoUrl,
  thumbnailUrl,
  duration,
  bytes,
  publicId,
  version,
  operatorId,
  accountId,
  cameraName,
}) => {
  const existingScan = await getScanByTrackingId(trackingId);

  if (existingScan) {
    // Old Cloudinary video delete
    if (existingScan.publicId) {
      try {
        await deleteVideoFromCloudinary(existingScan.publicId);
      } catch (error) {
        console.error("Failed to delete old video:", error);
      }
    }

    // Same row update
    return await updateScan(existingScan.id, {
      userId,
      status: "COMPLETED",

      videoUrl,
      thumbnailUrl,

      duration: duration ? Math.round(duration) : null,
      fileSize: bytes,

      publicId,
      version,

      uploadedAt: new Date(),

      operatorId: operatorId || null,
      accountId: accountId || null,
      cameraName: cameraName || null,
    });
  }

  // First time create
  return await createUploadedScan({
    trackingId,
    userId,
    status: "COMPLETED",

    videoUrl,
    thumbnailUrl,

    duration: duration ? Math.round(duration) : null,
    fileSize: bytes,

    publicId,
    version,

    uploadedAt: new Date(),

    operatorId: operatorId || null,
    accountId: accountId || null,
    cameraName: cameraName || null,
  });
};

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