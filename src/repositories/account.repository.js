import prisma from "../config/prisma.js";

// ======================================================
// Count Accounts By User
// ======================================================

export const countAccountsByUserId = async (userId) => {
  return await prisma.account.count({
    where: {
      userId,
    },
  });
};

// ======================================================
// Create Account
// ======================================================

export const createAccount = async (data) => {
  return await prisma.account.create({
    data,
  });
};

// ======================================================
// Get All Accounts
// ======================================================

export const getAccountsByUserId = async (userId) => {
  return await prisma.account.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ======================================================
// Get Account By Id
// ======================================================

export const getAccountById = async (id, userId) => {
  return await prisma.account.findFirst({
    where: {
      id,
      userId,
    },
  });
};

// ======================================================
// Update Account
// ======================================================

export const updateAccount = async (id, data) => {
  return await prisma.account.update({
    where: {
      id,
    },
    data,
  });
};

// ======================================================
// Delete Account
// ======================================================

export const deleteAccount = async (id, userId) => {
  return await prisma.account.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

// ======================================================
// Find Account By Name
// ======================================================

export const findAccountByName = async (accountName, userId) => {
  return await prisma.account.findFirst({
    where: {
      accountName,
      userId,
    },
  });
};