import {
  signupSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth.validation.js";
import {
  signupService,
  loginService,
  logoutService,
  refreshTokenService,
  getMeService,
  sendOtpService,
  verifyOtpService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/auth.service.js";
import { resendOtpService } from "../repositories/auth.repository.js";
import { ZodError } from "zod";

export const signup = async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);

    const result = await signupService(data);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const result = await loginService(data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    await logoutService(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const tokens = await refreshTokenService(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: tokens,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await getMeService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const data = sendOtpSchema.parse(req.body);

    await sendOtpService(data);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const data = verifyOtpSchema.parse(req.body);

    const result = await verifyOtpService(data);

    if (result.type === "EMAIL_VERIFICATION") {
      return res.status(200).json({
        success: true,

        message: "Email verified successfully.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "OTP verified successfully.",

      resetToken: result.resetToken,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    await forgotPasswordService(data);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    await resetPasswordService(data);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const data = sendOtpSchema.parse(req.body);

    await resendOtpService(data);

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
