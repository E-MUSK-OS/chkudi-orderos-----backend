import { z } from "zod";

// ======================================================
// Operator Login Validation
// ======================================================

export const operatorLoginSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, "Employee code is required.")
    .max(20, "Employee code cannot exceed 20 characters."),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(50, "Password cannot exceed 50 characters."),
});