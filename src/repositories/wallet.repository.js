import prisma from "../config/prisma.js";

// =====================================
// Get Wallet By User
// =====================================

export const findWalletByUserId = async (userId) => {
  return prisma.wallet.findUnique({
    where: {
      userId,
    },
  });
};

// =====================================
// Create Wallet
// =====================================

export const createWallet = async ({ userId, points = 0 }) => {
  return prisma.wallet.create({
    data: {
      userId,
      points,
    },
  });
};

// =====================================
// Update Wallet Points
// =====================================

export const updateWalletPoints = async ({ walletId, points }) => {
  return prisma.wallet.update({
    where: {
      id: walletId,
    },
    data: {
      points,
    },
  });
};

// =====================================
// Create Wallet Transaction
// =====================================

export const createWalletTransaction = async ({
  walletId,
  type,
  points,
  balanceAfter,
  description,
  referenceId,
}) => {
  return prisma.walletTransaction.create({
    data: {
      walletId,
      type,
      points,
      balanceAfter,
      description,
      referenceId,
    },
  });
};

// =====================================
// Get Wallet With Transactions
// =====================================

export const findWalletWithTransactions = async (userId) => {
  return prisma.wallet.findUnique({
    where: {
      userId,
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
};

export const getWalletByUserId = async (userId) => {
  return prisma.wallet.findUnique({
    where: {
      userId,
    },
  });
};
