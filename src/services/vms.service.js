import {
  createScan,
  getScanById,
  getScanByTrackingId,
  updateScan,
  getAllScans,
  getScanCount,
  deleteScan,
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

export const uploadRecordingService = async ({
  trackingId,
  file,
  operatorId,
  cameraName,
}) => {
  return {
    success: true,
    trackingId,
    file,
    operatorId,
    cameraName,
  };
};
