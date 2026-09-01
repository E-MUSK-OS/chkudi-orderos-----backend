import { Router } from "express";

import {
  getProfile,
  updateProfile,
} from "../controllers/profile.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", verifyJWT, getProfile);

router.patch("/", verifyJWT, updateProfile);

export default router;
