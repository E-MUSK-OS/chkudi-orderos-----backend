import {
  createPartyRepo,
  findPartiesRepo,
  findPartyByIdRepo,
  findPartyByNameRepo,
  updatePartyRepo,
  deletePartyRepo,
} from "../repositories/party.repository.js";

export const createPartyService = async (userId, data) => {
  const existingParty = await findPartyByNameRepo(data.partyName, userId);
  if (existingParty) {
    throw new Error("Party/Account with this name already exists.");
  }

  // Format joinDate if provided
  const joinDate = data.joinDate ? new Date(data.joinDate) : new Date();

  return await createPartyRepo({
    ...data,
    userId,
    joinDate,
    accountHead: data.accountHead || "Sundry Debtors",
    balanceType: data.balanceType || "Credit",
    openingBalance: Number(data.openingBalance) || 0,
    billDueDays: Number(data.billDueDays) || 0,
    creditLimit: Number(data.creditLimit) || 0,
    debitLimit: Number(data.debitLimit) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  });
};

export const getPartiesService = async (userId, query = {}) => {
  return await findPartiesRepo(userId, {
    search: query.search || "",
    accountHead: query.accountHead,
    limit: query.limit ? Number(query.limit) : 50,
    page: query.page ? Number(query.page) : 1,
  });
};

export const getPartyByIdService = async (id, userId) => {
  const party = await findPartyByIdRepo(id, userId);
  if (!party) {
    throw new Error("Party/Account not found.");
  }
  return party;
};

export const updatePartyService = async (id, userId, data) => {
  const existing = await findPartyByIdRepo(id, userId);
  if (!existing) {
    throw new Error("Party/Account not found.");
  }

  if (data.partyName && data.partyName.toLowerCase() !== existing.partyName.toLowerCase()) {
    const duplicate = await findPartyByNameRepo(data.partyName, userId);
    if (duplicate && duplicate.id !== id) {
      throw new Error("Another Party with this name already exists.");
    }
  }

  const updateData = { ...data };
  if (data.joinDate) {
    updateData.joinDate = new Date(data.joinDate);
  }
  if (data.openingBalance !== undefined) {
    updateData.openingBalance = Number(data.openingBalance);
  }
  if (data.billDueDays !== undefined) {
    updateData.billDueDays = Number(data.billDueDays);
  }
  if (data.creditLimit !== undefined) {
    updateData.creditLimit = Number(data.creditLimit);
  }
  if (data.debitLimit !== undefined) {
    updateData.debitLimit = Number(data.debitLimit);
  }

  return await updatePartyRepo(id, userId, updateData);
};

export const deletePartyService = async (id, userId) => {
  const existing = await findPartyByIdRepo(id, userId);
  if (!existing) {
    throw new Error("Party/Account not found.");
  }
  return await deletePartyRepo(id, userId);
};
