import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getClientConfig,
  updateClientConfig,
} from "../controllers/clientConfiguration.controller.js";

const router = Router();

router.get("/", verifyJWT, getClientConfig);
router.put("/", verifyJWT, updateClientConfig);
router.patch("/", verifyJWT, updateClientConfig);

export default router;

