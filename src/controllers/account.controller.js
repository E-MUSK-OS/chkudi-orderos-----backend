import {
  createAccountService,
  getAllAccountsService,
  getAccountByIdService,
  updateAccountService,
  deleteAccountService,
} from "../services/account.service.js";

import {
  createAccountSchema,
  updateAccountSchema,
} from "../validations/account.validation.js";

// ======================================================
// Create Account
// ======================================================

export const createAccount = async (req, res, next) => {
  try {
    const data = createAccountSchema.parse(req.body);

    const account = await createAccountService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Accounts
// ======================================================

export const getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await getAllAccountsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Account By Id
// ======================================================

export const getAccountById = async (req, res, next) => {
  try {
    const account = await getAccountByIdService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Account
// ======================================================

export const updateAccount = async (req, res, next) => {
  try {
    const data = updateAccountSchema.parse(req.body);

    const account = await updateAccountService(
      req.params.id,
      req.user.id,
      data
    );

    return res.status(200).json({
      success: true,
      message: "Account updated successfully.",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Account
// ======================================================

export const deleteAccount = async (req, res, next) => {
  try {
    await deleteAccountService(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};