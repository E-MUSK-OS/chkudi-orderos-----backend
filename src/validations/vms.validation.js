import { z } from "zod";

export const uploadVMSSchema = z.object({
  trackingId: z
    .string()
    .trim()
    .min(1, "Tracking ID is required")
    .max(100, "Tracking ID is too long"),

//   operatorId: z.string().optional(),

//   cameraName: z.string().optional(),
});
