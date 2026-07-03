import { z } from "zod";

// export const signupSchema = z.object({
//   fullName: z.string().min(3, "Full name must be at least 3 characters"),

//   email: z.string().email("Invalid email address"),

//   password: z.string().min(8, "Password must be at least 8 characters"),
// });

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Full name must be at least 3 characters"),

    email: z.string().trim().email("Invalid email address"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
        "Password must contain uppercase, lowercase, number and special character",
      ),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),

  password: z.string().min(8),
});

export const sendOtpSchema = z.object({
  email: z.string().trim().email("Invalid email"),

  purpose: z.enum(["EMAIL_VERIFICATION", "FORGOT_PASSWORD"]),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email("Invalid email"),

  otp: z.string().length(6, "OTP must be 6 digits"),

  purpose: z.enum(["EMAIL_VERIFICATION", "FORGOT_PASSWORD"]),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    resetToken: z.string().trim().min(1, "Reset token is required"),

    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must not exceed 100 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
        "Password must contain uppercase, lowercase, number and special character",
      ),

    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
