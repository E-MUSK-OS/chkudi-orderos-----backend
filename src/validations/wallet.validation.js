import { z } from "zod";

// ======================================
// Credit Wallet
// ======================================

export const creditWalletSchema = z.object({
  points: z
    .number({
      required_error: "Points are required",
    })
    .int()
    .positive("Points must be greater than 0"),

  description: z
    .string()
    .trim()
    .max(255)
    .optional(),

  referenceId: z
    .string()
    .trim()
    .optional(),
});

// ======================================
// Debit Wallet
// ======================================

export const debitWalletSchema = z.object({
  points: z
    .number({
      required_error: "Points are required",
    })
    .int()
    .positive("Points must be greater than 0"),

  description: z
    .string()
    .trim()
    .max(255)
    .optional(),

  referenceId: z
    .string()
    .trim()
    .optional(),
});