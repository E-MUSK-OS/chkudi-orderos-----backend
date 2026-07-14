import express from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
} from "../controllers/account.controller.js";

const router = express.Router();

router.post("/", verifyJWT, createAccount);
router.get("/", verifyJWT, getAllAccounts);
router.get("/:id", verifyJWT, getAccountById);
router.put("/:id", verifyJWT, updateAccount);
router.delete("/:id", verifyJWT, deleteAccount);

export default router;