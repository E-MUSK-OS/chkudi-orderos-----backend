import prisma from "../config/prisma.js";

const profileSelect = {
  id: true,
  fullName: true,
  username: true,
  email: true,
  phone: true,
  role: true,
  isVerified: true,
  isActive: true,
  avatar: true,
  dob: true,
  gender: true,
  departments: true,
  companies: true,
  allowedPages: true,
  createdAt: true,
  updatedAt: true,
  userMapping: {
    select: {
      superAdminId: true,
      adminId: true,
      departments: true,
      companies: true,
      superAdmin: {
        select: { id: true, fullName: true, email: true, role: true },
      },
      admin: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  },
};

export const getProfileById = async (id) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
    select: profileSelect,
  });
};

export const updateProfile = async (id, data) => {
  return prisma.user.update({
    where: {
      id,
    },
    data,
    select: profileSelect,
  });
};
