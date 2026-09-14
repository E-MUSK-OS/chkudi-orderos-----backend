import { z } from "zod";

export const uploadVMSSchema = z.object({
  trackingId: z
    .string()
    .trim()
    .min(1, "Tracking ID is required")
    .max(50, "Tracking ID is too long")
    .refine(
      (val) =>
        !val.includes("|") &&
        !val.includes("http://") &&
        !val.includes("https://") &&
        !val.includes("\\") &&
        !/\s/.test(val),
      {
        message: "Not valid QR code",
      },
    ),

  userId: z.string().trim().min(1, "User ID is required"),

  operatorId: z.string().trim().optional(),

  accountId: z.string().trim().optional(),

  cameraName: z.string().trim().optional(),
});

export const getUserVMSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required"),
});

export const updatePackingScanSchema = z.object({
  trackingId: z.string().trim().min(1, "Tracking ID is required"),

  userId: z.string().trim().min(1, "User ID is required"),
});
