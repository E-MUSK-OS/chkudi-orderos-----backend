import { Router } from "express";

import {
  createScan,
  uploadRecording,
  getAllScans,
  getScanById,
  getScanByTrackingId,
  updateScan,
  deleteScan,
  getUploadSignature,
} from "../controllers/vms.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = Router();

router.post("/", createScan);
router.post("/upload", upload.single("video"), uploadRecording);
router.post("/signature", getUploadSignature);
router.get("/", getAllScans);
router.get("/tracking/:trackingId", getScanByTrackingId);
router.get("/:id", getScanById);
router.patch("/:id", updateScan);
router.delete("/:id", deleteScan);

export default router;
