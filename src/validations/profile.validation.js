import { z } from "zod";

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must not exceed 100 characters")
      .optional(),

    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .optional(),

    phone: z
      .string()
      .trim()
      .max(20, "Phone number must not exceed 20 digits")
      .optional()
      .nullable(),

    avatar: z
      .string()
      .optional()
      .nullable(),

    dob: z
      .string()
      .or(z.date())
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),

    gender: z
      .string()
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
