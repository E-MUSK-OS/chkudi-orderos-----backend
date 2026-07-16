import { ZodError } from "zod";

import {
  creditWalletSchema,
  debitWalletSchema,
} from "../validations/wallet.validation.js";

import {
  getWalletService,
  creditWalletService,
  debitWalletService,
  walletHistoryService,
} from "../services/wallet.service.js";

// ========================================
// Get Wallet
// ========================================

export const getWallet = async (req, res) => {
  try {
    const wallet = await getWalletService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Wallet fetched successfully",
      data: wallet,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Credit Wallet
// ========================================

export const creditWallet = async (req, res) => {
  try {
    const data = creditWalletSchema.parse(req.body);

    const wallet = await creditWalletService({
      userId: req.user.id,
      ...data,
    });

    return res.status(200).json({
      success: true,
      message: "Wallet credited successfully",
      data: wallet,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Debit Wallet
// ========================================

export const debitWallet = async (req, res) => {
  try {
    const data = debitWalletSchema.parse(req.body);

    const wallet = await debitWalletService({
      userId: req.user.id,
      ...data,
    });

    return res.status(200).json({
      success: true,
      message: "Wallet debited successfully",
      data: wallet,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Wallet History
// ========================================

export const walletHistory = async (req, res) => {
  try {
    const history = await walletHistoryService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Wallet history fetched successfully",
      data: history,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};