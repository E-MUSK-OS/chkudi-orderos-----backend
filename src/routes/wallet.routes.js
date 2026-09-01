import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  getWallet,
  creditWallet,
  debitWallet,
  walletHistory,
} from "../controllers/wallet.controller.js";

const router = Router();

// =========================
// Wallet
// =========================

router.get("/", verifyJWT, getWallet);

router.get("/history", verifyJWT, walletHistory);

router.post("/credit", verifyJWT, creditWallet);

router.post("/debit", verifyJWT, debitWallet);

export default router;