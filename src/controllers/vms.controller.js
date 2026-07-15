import {
  uploadVMSSchema,
  getUserVMSchema,
  updatePackingScanSchema,
} from "../validations/vms.validation.js";

import {
  createScanService,
  getScanByIdService,
  getScanByTrackingIdService,
  getAllScansService,
  updateScanService,
  deleteScanService,
  uploadRecordingService,
  getUploadSignatureService,
  saveRecordingService,
  getUserVMSService,
  updatePackingScanStatusService,
} from "../services/vms.service.js";

export const createScan = async (req, res, next) => {
  try {
    const body = uploadVMSSchema.parse(req.body);

    const scan = await createScanService(body);

    return res.status(201).json({
      success: true,
      message: "Scan created successfully.",
      data: scan,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadRecording = async (req, res, next) => {
  // console.log("UPLOAD HIT");

  // console.log(req.body);

  // console.log(req.file);
  try {
    const body = uploadVMSSchema.parse(req.body);

    const result = await uploadRecordingService({
      trackingId: body.trackingId,
      userId: body.userId,
      file: req.file,
      operatorId: body.operatorId,
      accountId: body.accountId,
      cameraName: body.cameraName,
    });

    return res.status(200).json({
      success: true,
      message: "Recording uploaded successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getScanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const scan = await getScanByIdService(id);

    return res.status(200).json({
      success: true,
      data: scan,
    });
  } catch (error) {
    next(error);
  }
};

export const getScanByTrackingId = async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    const scan = await getScanByTrackingIdService(trackingId);

    return res.status(200).json({
      success: true,
      data: scan,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllScans = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getAllScansService({
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateScan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const scan = await updateScanService(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Scan updated successfully.",
      data: scan,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteScan = async (req, res, next) => {
  try {
    const { id } = req.params;

    await deleteScanService(id);

    return res.status(200).json({
      success: true,
      message: "Scan deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const getUploadSignature = async (req, res, next) => {
  try {
    const signature = await getUploadSignatureService(req.body.publicId);

    return res.status(200).json({
      success: true,
      message: "Cloudinary upload signature generated successfully.",
      data: signature,
    });
  } catch (error) {
    next(error);
  }
};

export const saveRecording = async (req, res, next) => {
  try {
    const result = await saveRecordingService(req.body);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserVMS = async (req, res, next) => {
  try {
    const body = getUserVMSchema.parse(req.body);

    const scans = await getUserVMSService(body.userId);

    return res.status(200).json({
      success: true,
      message: "User VMS fetched successfully.",
      total: scans.length,
      data: scans,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePackingScanStatus = async (req, res, next) => {
  try {
    const body = updatePackingScanSchema.parse(req.body);

    const result = await updatePackingScanStatusService({
      trackingId: body.trackingId,
      userId: body.userId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
