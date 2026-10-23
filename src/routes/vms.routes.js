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
import { verifyVmsAuth } from "../middleware/vmsAuth.middleware.js";

const router = Router();

router.post("/", verifyVmsAuth, createScan);
router.post("/upload", verifyVmsAuth, upload.single("video"), uploadRecording);
router.post("/user", verifyVmsAuth, getUserVMS);
router.patch("/packing-scan", verifyVmsAuth, updatePackingScanStatus);
router.get("/", verifyVmsAuth, getAllScans);
router.get("/media/:id/video", streamRecording);
router.get("/media/:id/thumbnail", streamThumbnail);
router.get("/tracking/:trackingId", verifyVmsAuth, getScanByTrackingId);
router.get("/:id", verifyVmsAuth, getScanById);
router.patch("/:id", verifyVmsAuth, updateScan);
router.delete("/:id", verifyVmsAuth, deleteScan);

export default router;
