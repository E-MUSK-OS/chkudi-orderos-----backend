import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import { createTransfer } from "../controllers/transfer.controller.js";

const router = express.Router();

router.post("/", verifyJWT, createTransfer);

export default router;