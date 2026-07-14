import { z } from "zod";

export const uploadVMSSchema = z.object({
  trackingId: z
    .string()
    .trim()
    .min(1, "Tracking ID is required")
    .max(100, "Tracking ID is too long"),

  userId: z.string().trim().min(1, "User ID is required"),

  operatorId: z.string().trim().optional(),

  accountId: z.string().trim().optional(),

  cameraName: z.string().trim().optional(),
});

export const getUserVMSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
});
