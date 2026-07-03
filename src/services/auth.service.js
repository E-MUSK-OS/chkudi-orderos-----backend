import bcrypt from "bcrypt";
import {
  findUserByEmail,
  createUser,
  createRefreshToken,
  deleteRefreshTokensByUserId,
  deleteRefreshToken,
  findRefreshToken,
  findUserProfileById,
  verifyUserEmail,
  updateUserPassword,
} from "../repositories/auth.repository.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../utils/jwt.js";
import { generateUniqueUsername } from "../utils/username.js";
import { generateOTP } from "../utils/otp.js";
import { otpTemplate } from "../mails/templates/otp.template.js";
import { sendMail } from "../mailer/mailer.js";
import {
  createOtp,
  deleteOldOtps,
  countRecentOtps,
  findOtp,
  deleteOtp,
} from "../repositories/otp.repository.js";

export const signupService = async ({ fullName, email, password }) => {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const username = await generateUniqueUsername(fullName);

  const user = await createUser({
    fullName,
    email,
    username,
    password: hashedPassword,
  });

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + 7);

  await createRefreshToken({
    token: refreshToken,
    userId: user.id,
    expiresAt,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

export const loginService = async ({ email, password }) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await deleteRefreshTokensByUserId(user.id);

  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + 7);

  await createRefreshToken({
    token: refreshToken,
    userId: user.id,
    expiresAt,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

export const logoutService = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  verifyRefreshToken(refreshToken);

  const token = await findRefreshToken(refreshToken);

  if (!token) {
    throw new Error("Refresh token not found");
  }

  await deleteRefreshToken(refreshToken);

  return true;
};

export const refreshTokenService = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  verifyRefreshToken(refreshToken);

  const savedToken = await findRefreshToken(refreshToken);

  if (!savedToken) {
    throw new Error("Invalid refresh token");
  }

  const payload = {
    id: savedToken.user.id,
    email: savedToken.user.email,
    role: savedToken.user.role,
  };

  const newAccessToken = generateAccessToken(payload);

  const newRefreshToken = generateRefreshToken(payload);

  await deleteRefreshToken(refreshToken);

  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + 7);

  await createRefreshToken({
    token: newRefreshToken,
    userId: savedToken.user.id,
    expiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const getMeService = async (userId) => {
  const user = await findUserProfileById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const sendOtpService = async ({ email, purpose }) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("User not found");
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const otpCount = await countRecentOtps({
    email,
    purpose,
    from: oneHourAgo,
  });

  if (otpCount >= 5) {
    throw new Error("Too many OTP requests. Please try again later.");
  }

  await deleteOldOtps({
    email,
    purpose,
  });

  const otp = generateOTP();

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await createOtp({
    email,
    otp,
    purpose,
    expiresAt,
    verified: false,
  });

  await sendMail({
    to: email,

    subject:
      purpose === "EMAIL_VERIFICATION"
        ? "Verify Your Email"
        : "Reset Password OTP",

    html: otpTemplate({
      fullName: user.fullName,
      otp,
      title:
        purpose === "EMAIL_VERIFICATION" ? "Verify Email" : "Reset Password",

      message:
        purpose === "EMAIL_VERIFICATION"
          ? "Use the OTP below to verify your email."
          : "Use the OTP below to reset your password.",
    }),
  });

  return true;
};

export const forgotPasswordService = async ({ email }) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("User not found");
  }

  await sendOtpService({
    email,
    purpose: "FORGOT_PASSWORD",
  });

  return true;
};

export const verifyOtpService = async ({ email, otp, purpose }) => {
  const savedOtp = await findOtp({
    email,
    otp,
    purpose,
  });

  if (!savedOtp) {
    throw new Error("Invalid OTP");
  }

  if (savedOtp.expiresAt < new Date()) {
    await deleteOtp(savedOtp.id);

    throw new Error("OTP has expired");
  }

  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("User not found");
  }

  // ==============================
  // Email Verification
  // ==============================

  if (purpose === "EMAIL_VERIFICATION") {
    await verifyUserEmail(user.id);

    await deleteOtp(savedOtp.id);

    return {
      type: "EMAIL_VERIFICATION",
    };
  }

  // ==============================
  // Forgot Password
  // ==============================

  const resetToken = generatePasswordResetToken({
    id: user.id,

    email: user.email,
  });

  await deleteOtp(savedOtp.id);

  return {
    type: "FORGOT_PASSWORD",

    resetToken,
  };
};

export const resetPasswordService = async ({ resetToken, newPassword }) => {
  let payload;

  try {
    payload = verifyPasswordResetToken(resetToken);
  } catch (error) {
    throw new Error("Invalid or expired reset token");
  }

  const user = await findUserByEmail(payload.email);

  if (!user) {
    throw new Error("User not found");
  }

  // 3. Check New Password != Old Password  👈 અહીં
  const isSamePassword = await bcrypt.compare(newPassword, user.password);

  if (isSamePassword) {
    throw new Error("New password must be different from the current password");
  }

  // 4. Hash New Password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 5. Update Password
  await updateUserPassword(user.id, hashedPassword);

  // 6. Logout All Devices
  await deleteRefreshTokensByUserId(user.id);

  return true;
};
