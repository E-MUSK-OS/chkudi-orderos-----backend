import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createTagLoop,
  getTagLoops,
  getTagLoopDashboard,
  exportTagLoop,
  deleteTagLoop,
} from "../controllers/tagLoop.controller.js";

const router = Router();

// ========================================
// Tag Loop
// ========================================

router.post("/", verifyJWT, createTagLoop);
router.get("/dashboard", verifyJWT, getTagLoopDashboard);
router.get("/:id/export", verifyJWT, exportTagLoop);
router.delete("/:id", verifyJWT, deleteTagLoop);

router.get("/", verifyJWT, getTagLoops);

export default router;
