import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z
    .string({ required_error: "First name is required." })
    .trim()
    .min(1, "First name is required.")
    .max(50, "First name cannot exceed 50 characters."),

  middleName: z
    .string()
    .trim()
    .max(50, "Middle name cannot exceed 50 characters.")
    .optional()
    .nullable(),

  lastName: z
    .string({ required_error: "Last name is required." })
    .trim()
    .min(1, "Last name is required.")
    .max(50, "Last name cannot exceed 50 characters."),

  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .email("Please provide a valid email address.")
    .toLowerCase(),

  phone: z
    .string({ required_error: "Mobile number is required." })
    .trim()
    .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits."),

  password: z
    .string({ required_error: "Password is required." })
    .min(8, "Password must be at least 8 characters."),

  dob: z
    .string()
    .optional()
    .nullable(),

  gender: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable(),

  departments: z
    .array(z.string().trim())
    .optional()
    .default([]),

  companies: z
    .array(z.string().trim())
    .optional()
    .default([]),

  role: z
    .enum(["USER", "ADMIN", "SUPERADMIN"])
    .optional()
    .default("USER"),

  allowedPages: z
    .array(z.string().trim())
    .optional()
    .default([]),

  rights: z
    .string()
    .optional()
    .nullable(),

  avatar: z
    .string()
    .optional()
    .nullable(),

  isActive: z
    .boolean()
    .optional()
    .default(true),
});

export const updateUserSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name cannot be empty.")
    .max(50)
    .optional(),

  middleName: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable(),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name cannot be empty.")
    .max(50)
    .optional(),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .toLowerCase()
    .optional(),

  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits.")
    .optional()
    .nullable(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .optional()
    .nullable(),

  dob: z
    .string()
    .optional()
    .nullable(),

  gender: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable(),

  departments: z
    .array(z.string().trim())
    .optional(),

  companies: z
    .array(z.string().trim())
    .optional(),

  role: z
    .enum(["USER", "ADMIN", "SUPERADMIN"])
    .optional(),

  allowedPages: z
    .array(z.string().trim())
    .optional(),

  rights: z
    .string()
    .optional()
    .nullable(),

  avatar: z
    .string()
    .optional()
    .nullable(),

  isActive: z
    .boolean()
    .optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: "isActive status boolean is required." }),
});

