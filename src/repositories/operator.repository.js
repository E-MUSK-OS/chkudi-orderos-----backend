import prisma from "../config/prisma.js";

// ==========================================
// Count Operators By User
// ==========================================

export const countOperatorsByUserId = async (userId) => {
  return await prisma.operator.count({
    where: {
      userId,
    },
  });
};

// ==========================================
// Create Operator
// ==========================================

export const createOperator = async (data) => {
  return await prisma.operator.create({
    data,
  });
};

// ==========================================
// Get All Operators
// ==========================================

export const getOperatorsByUserId = async (userId) => {
  return await prisma.operator.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ==========================================
// Get Operator By Id
// ==========================================

export const getOperatorById = async (id, userId) => {
  return await prisma.operator.findFirst({
    where: {
      id,
      userId,
    },
  });
};

export const updateOperator = async (id, data) => {
  return prisma.operator.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteOperator = async (id, userId) => {
  return await prisma.operator.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

export const findOperatorByEmployeeCode = async (employeeCode, userId) => {
  return prisma.operator.findFirst({
    where: {
      employeeCode,
      userId,
    },
  });
};
