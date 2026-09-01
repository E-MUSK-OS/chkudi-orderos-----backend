import { z } from "zod";

// ======================================
// Create Tag Loop
// ======================================

export const createTagLoopSchema = z.object({
  startTag: z
    .string({
      required_error: "Start Tag is required",
    })
    .trim()
    .min(1, "Start Tag is required")
    .regex(/^[A-Za-z]+\d+$/, {
      message: "Invalid TAG format",
    }),

  total: z
    .number({
      required_error: "Total is required",
    })
    .int("Total must be an integer")
    .positive("Total must be greater than 0"),
});