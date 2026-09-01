import prisma from "../config/prisma.js";
import { sendOtpService } from "../services/auth.service.js";

export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

export const createUser = async (data) => {
  return prisma.user.create({
    data,
  });
};
export const createRefreshToken = async ({ token, userId, expiresAt }) => {
  return prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
};

export const deleteRefreshTokensByUserId = async (userId) => {
  return prisma.refreshToken.deleteMany({
    where: {
      userId,
    },
  });
};

export const findRefreshToken = async (token) => {
  return prisma.refreshToken.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });
};

export const deleteRefreshToken = async (token) => {
  return prisma.refreshToken.deleteMany({
    where: {
      token,
    },
  });
};

export const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
};

export const findUserProfileById = async (id) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const deleteOtpById = async (id) => {
  return prisma.emailOtp.delete({
    where: {
      id,
    },
  });
};

export const verifyUserEmail = async (userId) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isVerified: true,
    },
  });
};

export const updateUserPassword = async (userId, hashedPassword) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });
};

export const resendOtpService = async ({ email, purpose }) => {
  await sendOtpService({
    email,
    purpose,
  });

  return true;
};
