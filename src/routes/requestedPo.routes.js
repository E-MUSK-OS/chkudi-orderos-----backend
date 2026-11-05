import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getRequestedPOs,
  getLatestPoDates,
  getRequestedPOById,
  createRequestedPO,
  updateRequestedPO,
  deleteRequestedPO,
} from "../controllers/requestedPo.controller.js";

const router = Router();

router.get("/", verifyJWT, getRequestedPOs);
router.get("/latest-dates", verifyJWT, getLatestPoDates);
router.get("/:id", verifyJWT, getRequestedPOById);
router.post("/", verifyJWT, createRequestedPO);
router.put("/:id", verifyJWT, updateRequestedPO);
router.delete("/:id", verifyJWT, deleteRequestedPO);

export default router;

