import prisma from "../config/prisma.js";

// export const findOperatorByEmployeeCode = async (employeeCode) => {
//   return await prisma.operator.findUnique({
//     where: {
//       employeeCode,
//     },
//     include: {
//       user: {
//         select: {
//           id: true,
//           fullName: true,
//           email: true,
//           role: true,
//           isActive: true,
//         },
//       },
//     },
//   });
// };

export const findOperatorByEmployeeCode = async (userId, employeeCode) => {
  return await prisma.operator.findFirst({
    where: {
      userId,
      employeeCode,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });
};

export const findOperatorById = async (id) => {
  return await prisma.operator.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });
};

export const updateOperatorHeartbeat = async (operatorId, sessionId) => {
  return await prisma.operator.updateMany({
    where: {
      id: operatorId,
      sessionId,
    },
    data: {
      lastSeen: new Date(),
    },
  });
};
