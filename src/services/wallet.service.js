import {
  findWalletByUserId,
  createWallet,
  updateWalletPoints,
  createWalletTransaction,
  findWalletWithTransactions,
  getWalletByUserId,
} from "../repositories/wallet.repository.js";

// ========================================
// Get Wallet
// ========================================

export const getWalletService = async (userId) => {
  let wallet = await findWalletByUserId(userId);

  if (!wallet) {
    wallet = await createWallet({
      userId,
      points: 0,
    });
  }

  return wallet;
};

// ========================================
// Credit Points
// ========================================

export const creditWalletService = async ({
  userId,
  points,
  description,
  referenceId,
}) => {
  let wallet = await findWalletByUserId(userId);

  if (!wallet) {
    wallet = await createWallet({
      userId,
      points: 0,
    });
  }

  const newBalance = wallet.points + points;

  await updateWalletPoints({
    walletId: wallet.id,
    points: newBalance,
  });

  await createWalletTransaction({
    walletId: wallet.id,
    type: "CREDIT",
    points,
    balanceAfter: newBalance,
    description,
    referenceId,
  });

  return {
    balance: newBalance,
  };
};

// ========================================
// Debit Points
// ========================================

export const debitWalletService = async ({
  userId,
  points,
  description,
  referenceId,
}) => {
  const wallet = await findWalletByUserId(userId);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.points < points) {
    throw new Error("Insufficient wallet balance");
  }

  const newBalance = wallet.points - points;

  await updateWalletPoints({
    walletId: wallet.id,
    points: newBalance,
  });

  await createWalletTransaction({
    walletId: wallet.id,
    type: "DEBIT",
    points,
    balanceAfter: newBalance,
    description,
    referenceId,
  });

  return {
    balance: newBalance,
  };
};

// ========================================
// Wallet History
// ========================================

export const walletHistoryService = async (userId) => {
  const wallet = await findWalletWithTransactions(userId);

  if (!wallet) {
    return {
      points: 0,
      transactions: [],
    };
  }

  return wallet;
};

export const deductWalletPoints = async ({
  userId,
  points,
  description,
  referenceId,
}) => {
  const wallet = await getWalletByUserId(userId);

  if (!wallet) {
    throw new Error("Wallet not found.");
  }

  if (wallet.points < points) {
    throw new Error("Insufficient wallet balance.");
  }

  const balanceAfter = wallet.points - points;

  await updateWalletPoints(wallet.id, balanceAfter);

  await createWalletTransaction({
    walletId: wallet.id,
    type: "DEBIT",
    points,
    balanceAfter,
    description,
    referenceId,
  });

  return balanceAfter;
};
