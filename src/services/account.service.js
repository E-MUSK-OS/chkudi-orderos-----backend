import {
  countAccountsByUserId,
  createAccount,
  getAccountsByUserId,
  getAccountById,
  updateAccount,
  deleteAccount,
  findAccountByName,
} from "../repositories/account.repository.js";

// ======================================================
// Create Account
// ======================================================

export const createAccountService = async (userId, data) => {
  // Maximum 5 Accounts
  const totalAccounts = await countAccountsByUserId(userId);

  if (totalAccounts >= 5) {
    throw new Error(
      "Maximum limit reached. You can create up to 5 accounts only."
    );
  }

  // Duplicate Account Name
  const existingAccount = await findAccountByName(
    data.accountName,
    userId
  );

  if (existingAccount) {
    throw new Error("Account name already exists.");
  }

  return await createAccount({
    accountName: data.accountName,
    userId,
  });
};

// ======================================================
// Get All Accounts
// ======================================================

export const getAllAccountsService = async (userId) => {
  return await getAccountsByUserId(userId);
};

// ======================================================
// Get Account By Id
// ======================================================

export const getAccountByIdService = async (id, userId) => {
  const account = await getAccountById(id, userId);

  if (!account) {
    throw new Error("Account not found.");
  }

  return account;
};

// ======================================================
// Update Account
// ======================================================

export const updateAccountService = async (
  id,
  userId,
  data
) => {
  const account = await getAccountById(id, userId);

  if (!account) {
    throw new Error("Account not found.");
  }

  // Duplicate Name Check
  if (
    data.accountName &&
    data.accountName !== account.accountName
  ) {
    const existingAccount = await findAccountByName(
      data.accountName,
      userId
    );

    if (existingAccount) {
      throw new Error("Account name already exists.");
    }
  }

  await updateAccount(id, data);

  return await getAccountById(id, userId);
};

// ======================================================
// Delete Account
// ======================================================

export const deleteAccountService = async (id, userId) => {
  const account = await getAccountById(id, userId);

  if (!account) {
    throw new Error("Account not found.");
  }

  await deleteAccount(id, userId);

  return true;
};