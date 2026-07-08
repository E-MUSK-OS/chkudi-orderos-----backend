import {
  createScan,
  getScanById,
  getScanByTrackingId,
  updateScan,
  getAllScans,
  getScanCount,
  deleteScan,
  createUploadedScan,
} from "../repositories/vms.repository.js";
import { uploadVideoToCloudinary } from "../utils/cloudinaryUpload.js";
import { generateThumbnailUrl } from "../utils/generateThumbnail.js";
import { generateUploadSignature } from "../utils/cloudinarySignature.js";
import { deleteVideoFromCloudinary } from "../utils/cloudinaryDelete.js";
import cloudinary from "../config/cloudinary.js";

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
  file,
  operatorId,
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
    status: "PENDING",
    operatorId: operatorId || null,
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
    });

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
//   videoUrl,
//   thumbnailUrl,
//   duration,
//   bytes,
//   publicId,
//   version,
//   operatorId,
//   cameraName,
// }) => {
//   let scan = await getScanByTrackingId(trackingId);

//   if (scan) {
//     if (scan.publicId) {
//       await deleteVideoFromCloudinary(scan.publicId);
//     }

//     scan = await updateScan(scan.id, {
//       status: "COMPLETED",

//       videoUrl,

//       thumbnailUrl,

//       duration: duration ? Math.round(duration) : null,

//       fileSize: bytes,

//       publicId,

//       version,

//       uploadedAt: new Date(),

//       operatorId: operatorId || null,

//       cameraName: cameraName || null,
//     });
//   } else {
//     scan = await createUploadedScan({
//       trackingId,

//       status: "COMPLETED",

//       videoUrl,

//       thumbnailUrl,

//       duration: duration ? Math.round(duration) : null,

//       fileSize: bytes,

//       publicId,

//       uploadedAt: new Date(),

//       operatorId: operatorId || null,

//       cameraName: cameraName || null,
//     });
//   }

//   return scan;
// };

export const saveRecordingService = async ({
  trackingId,
  videoUrl,
  thumbnailUrl,
  duration,
  bytes,
  publicId,
  version,
  operatorId,
  cameraName,
}) => {
  // Always create a new record for new uploads
  // This preserves history and prevents deletion issues

  // Check if there's an existing scan with this trackingId that is COMPLETED
  const existingScan = await getScanByTrackingId(trackingId);

  if (existingScan && existingScan.status === "COMPLETED") {
    // If there's a completed scan, create a new one instead of updating
    // This keeps history of all uploads
    const newScan = await createUploadedScan({
      trackingId,
      status: "COMPLETED",
      videoUrl,
      thumbnailUrl,
      duration: duration ? Math.round(duration) : null,
      fileSize: bytes,
      publicId,
      version,
      uploadedAt: new Date(),
      operatorId: operatorId || null,
      cameraName: cameraName || null,
    });
    return newScan;
  }

  // If scan exists but is not COMPLETED (PENDING, UPLOADING, FAILED), update it
  if (existingScan && existingScan.status !== "COMPLETED") {
    // Delete old video from Cloudinary if it exists
    if (existingScan.publicId) {
      try {
        await deleteVideoFromCloudinary(existingScan.publicId);
      } catch (error) {
        console.error("Failed to delete old video:", error);
        // Continue anyway
      }
    }

    const updatedScan = await updateScan(existingScan.id, {
      status: "COMPLETED",
      videoUrl,
      thumbnailUrl,
      duration: duration ? Math.round(duration) : null,
      fileSize: bytes,
      publicId,
      version,
      uploadedAt: new Date(),
      operatorId: operatorId || null,
      cameraName: cameraName || null,
    });
    return updatedScan;
  }

  // No existing scan, create a new one
  const newScan = await createUploadedScan({
    trackingId,
    status: "COMPLETED",
    videoUrl,
    thumbnailUrl,
    duration: duration ? Math.round(duration) : null,
    fileSize: bytes,
    publicId,
    version,
    uploadedAt: new Date(),
    operatorId: operatorId || null,
    cameraName: cameraName || null,
  });
  return newScan;
};
