import prisma from "../config/prisma.js";

export const getProfileById = async (id) => {
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

export const updateProfile = async (id, data) => {
  return prisma.user.update({
    where: {
      id,
    },
    data,
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