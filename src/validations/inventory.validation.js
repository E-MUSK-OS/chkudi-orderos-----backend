import { z } from "zod";

// ======================================================
// Update Inventory
// ======================================================

export const updateInventorySchema = z.object({
  reorderLevel: z
    .number({
      invalid_type_error: "Reorder level must be a number.",
    })
    .int("Reorder level must be an integer.")
    .min(0, "Reorder level cannot be negative.")
    .optional(),
});

// ======================================================
// Adjust Inventory
// ======================================================

export const adjustInventorySchema = z.object({
  quantity: z
    .number({
      required_error: "Quantity is required.",
      invalid_type_error: "Quantity must be a number.",
    })
    .int("Quantity must be an integer.")
    .positive("Quantity must be greater than zero."),

  adjustmentType: z.enum(
    [
      "IN",
      "OUT",
    ],
    {
      errorMap: () => ({
        message: "Adjustment type must be IN or OUT.",
      }),
    }
  ),

  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters.")
    .max(255, "Reason cannot exceed 255 characters."),
});