import prisma from "../config/prisma.js";

export const createScan = async (data) => {
  return await prisma.vMSScan.create({
    data,
  });
};

export const getScanById = async (id) => {
  return await prisma.vMSScan.findUnique({
    where: {
      id,
    },
  });
};

export const getScanByTrackingId = async (trackingId) => {
  return await prisma.vMSScan.findFirst({
    where: {
      trackingId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const updateScan = async (id, data) => {
  return await prisma.vMSScan.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteScan = async (id) => {
  return await prisma.vMSScan.delete({
    where: {
      id,
    },
  });
};

export const getAllScans = async ({ page = 1, limit = 20 }) => {
  return await prisma.vMSScan.findMany({
    skip: (page - 1) * limit,

    take: limit,

    orderBy: {
      createdAt: "desc",
    },

    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          isActive: true,
        },
      },

      operator: {
        select: {
          id: true,
          operatorName: true,
          employeeCode: true,
          isActive: true,
          isLoggedIn: true,
          sessionId: true,
          lastSeen: true,
        },
      },
    },
  });
};

export const getScanCount = async () => {
  return await prisma.vMSScan.count();
};

export const createUploadedScan = async (data) => {
  return await prisma.vMSScan.create({
    data,
  });
};

export const getUserVMS = async (userId) => {
  return await prisma.vMSScan.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          isActive: true,
        },
      },

      operator: {
        select: {
          id: true,
          operatorName: true,
          employeeCode: true,
          isActive: true,
          isLoggedIn: true,
          sessionId: true,
          lastSeen: true,
        },
      },
    },
  });
};
