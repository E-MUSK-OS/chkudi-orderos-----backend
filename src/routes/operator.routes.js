import { Router } from "express";

import {
  createOperator,
  getAllOperators,
  getOperatorById,
  updateOperator,
  deleteOperator,
} from "../controllers/operator.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", verifyJWT, createOperator);

router.get("/", verifyJWT, getAllOperators);

router.get("/:id", verifyJWT, getOperatorById);

router.put("/:id", verifyJWT, updateOperator);

router.delete("/:id", verifyJWT, deleteOperator);

export default router;
