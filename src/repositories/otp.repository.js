import prisma from "../config/prisma.js";

export const createOtp = async (data) => {
  return prisma.emailOtp.create({
    data,
  });
};

export const findOtp = async ({ email, otp, purpose }) => {
  return prisma.emailOtp.findFirst({
    where: {
      email,
      otp,
      purpose,
    },
  });
};

export const deleteOtp = async (id) => {
  return prisma.emailOtp.delete({
    where: {
      id,
    },
  });
};

export const deleteOldOtps = async ({ email, purpose }) => {
  return prisma.emailOtp.deleteMany({
    where: {
      email,
      purpose,
    },
  });
};

export const deleteExpiredOtps = async () => {
  return prisma.emailOtp.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};

export const countRecentOtps = async ({ email, purpose, from }) => {
  return prisma.emailOtp.count({
    where: {
      email,
      purpose,
      createdAt: {
        gte: from,
      },
    },
  });
};
