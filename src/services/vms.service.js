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

  // Create DB Row
  const existing = await getScanByTrackingId(trackingId);

  let scan;

  if (existing) {
    scan = await updateScan(existing.id, {
      status: "UPLOADING",

      operatorId: operatorId || null,

      cameraName: cameraName || null,
    });
  } else {
    scan = await createUploadedScan({
      trackingId,

      status: "UPLOADING",

      operatorId: operatorId || null,

      cameraName: cameraName || null,
    });
  }

  // Upload Video
  // const cloudinaryResult = await uploadVideoToCloudinary(
  //   file.buffer,
  //   trackingId,
  // );

  // await updateScan(scan.id, {
  //   status: "COMPLETED",

  //   videoUrl: cloudinaryResult.secure_url,

  //   fileName: file.originalname,

  //   fileSize: file.size,

  //   duration: cloudinaryResult.duration
  //     ? Math.round(cloudinaryResult.duration)
  //     : null,

  //   uploadedAt: new Date(),
  // });

  try {
    const cloudinaryResult = await uploadVideoToCloudinary(
      file.buffer,
      trackingId,
    );
    const thumbnailUrl = generateThumbnailUrl(cloudinaryResult.secure_url);

    await updateScan(scan.id, {
      status: "COMPLETED",

      videoUrl: cloudinaryResult.secure_url,

      thumbnailUrl,

      fileName: file.originalname,

      fileSize: file.size,

      duration: cloudinaryResult.duration
        ? Math.round(cloudinaryResult.duration)
        : null,

      uploadedAt: new Date(),
    });

    return await getScanById(scan.id);
  } catch (error) {
    await updateScan(scan.id, {
      status: "FAILED",
    });

    throw error;
  }

  // Return Updated Record
  return await getScanById(scan.id);
};

export const getUploadSignatureService = async () => {
  return generateUploadSignature();
};
