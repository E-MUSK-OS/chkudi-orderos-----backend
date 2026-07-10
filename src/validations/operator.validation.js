import { z } from "zod";

// ==========================================
// Create Operator Validation
// ==========================================

export const createOperatorSchema = z.object({
  operatorName: z
    .string()
    .trim()
    .min(2, "Operator name must be at least 2 characters.")
    .max(50, "Operator name cannot exceed 50 characters."),

  employeeCode: z
    .string()
    .trim()
    .max(20, "Employee code cannot exceed 20 characters.")
    .optional()
    .or(z.literal("")),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(50, "Password cannot exceed 50 characters."),
});

// ==========================================
// Update Operator Validation
// ==========================================

export const updateOperatorSchema = z.object({
  operatorName: z
    .string()
    .trim()
    .min(2, "Operator name must be at least 2 characters.")
    .max(50, "Operator name cannot exceed 50 characters.")
    .optional(),

  employeeCode: z
    .string()
    .trim()
    .max(20, "Employee code cannot exceed 20 characters.")
    .optional()
    .or(z.literal("")),

  isActive: z.boolean().optional(),
});
