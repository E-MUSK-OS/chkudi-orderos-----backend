import { Router } from "express";

import {
  createScan,
  uploadRecording,
  getAllScans,
  getScanById,
  getScanByTrackingId,
  updateScan,
  deleteScan,
  getUserVMS,
  updatePackingScanStatus,
} from "../controllers/vms.controller.js";
import upload from "../middleware/upload.middleware.js";

import { streamRecording, streamThumbnail } from "../controllers/media.controller.js";

const router = Router();

router.post("/", createScan);
router.post("/upload", upload.single("video"), uploadRecording);
router.post("/user", getUserVMS);
router.patch("/packing-scan", updatePackingScanStatus);
router.get("/", getAllScans);
router.get("/media/:id/video", streamRecording);
router.get("/media/:id/thumbnail", streamThumbnail);
router.get("/tracking/:trackingId", getScanByTrackingId);
router.get("/:id", getScanById);
router.patch("/:id", updateScan);
router.delete("/:id", deleteScan);

export default router;
