import { z } from "zod";

// ======================================================
// Create Account Validation
// ======================================================

export const createAccountSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(2, "Account name must be at least 2 characters.")
    .max(100, "Account name cannot exceed 100 characters."),
});

// ======================================================
// Update Account Validation
// ======================================================

export const updateAccountSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(2, "Account name must be at least 2 characters.")
    .max(100, "Account name cannot exceed 100 characters.")
    .optional(),
});