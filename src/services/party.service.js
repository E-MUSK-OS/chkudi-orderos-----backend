import {
  createPartyRepo,
  findPartiesRepo,
  findPartyByIdRepo,
  findPartyByNameRepo,
  updatePartyRepo,
  deletePartyRepo,
  bulkCreatePartiesRepo,
} from "../repositories/party.repository.js";
import prisma from "../config/prisma.js";
import { saveBase64Media } from "../utils/companyMediaNasPath.js";

function calculateCompletion(data) {
  const fields = [
    data.partyName,
    data.alias,
    data.accountHead,
    data.contactPerson,
    data.email,
    data.phone,
    data.addressLine1,
    data.pincode,
    data.city,
    data.state,
    data.gstin,
    data.pan,
    data.bankName,
    data.accountNumber,
    data.ifsc,
    data.logoUrl,
  ];
  const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
  return Math.min(100, Math.round((filled / fields.length) * 100));
}

function parseSafeDate(val) {
  if (!val) return new Date();
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return new Date();
    // DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const standard = new Date(trimmed);
    if (!isNaN(standard.getTime())) return standard;
  }
  return new Date();
}

function generateAccountCode(name) {
  if (!name) return "LDG";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 6);
}

export const createPartyService = async (userId, data, userDetails = {}) => {
  const partyName = (data.partyName || data.ledgerName || "").trim();
  if (!partyName) {
    throw new Error("Ledger Name is required.");
  }

  const existingParty = await findPartyByNameRepo(partyName, userId);
  if (existingParty) {
    throw new Error(`Ledger/Party "${partyName}" already exists.`);
  }

  const joinDate = parseSafeDate(data.joinDate || data.creationDate);

  const accountCode = data.accountCode || data.alias || generateAccountCode(partyName);
  const contactPerson = data.contactPerson || data.contactName || null;
  const phone = data.phone || data.contactNo || null;
  const gstin = data.gstin || data.gstNumber || null;
  const pan = data.pan || data.panNumber || null;
  const ifsc = data.ifsc || data.ifscCode || null;

  const logoUrl = await saveBase64Media(data.logoUrl, "ledger", `logo_${data.alias || "party"}`);

  const createdByName = data.createdByName || userDetails.fullName || userDetails.name || null;

  const completionPercentage = data.completionPercentage ?? calculateCompletion({
    partyName,
    alias: data.alias,
    accountHead: data.accountHead,
    contactPerson,
    email: data.email,
    phone,
    addressLine1: data.addressLine1,
    pincode: data.pincode,
    city: data.city,
    state: data.state,
    gstin,
    pan,
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    ifsc,
    logoUrl,
  });

  const payload = {
    ...data,
    userId,
    partyName,
    accountCode,
    alias: data.alias || accountCode,
    contactPerson,
    phone,
    gstin,
    pan,
    ifsc,
    logoUrl,
    joinDate,
    accountHead: data.accountHead || "Sundry Debtors",
    balanceType: data.balanceType || "Credit",
    openingBalance: Number(data.openingBalance) || 0,
    billDueDays: Number(data.billDueDays) || 0,
    creditLimit: Number(data.creditLimit) || 0,
    debitLimit: Number(data.debitLimit) || 0,
    creditDebitLimit: Number(data.creditDebitLimit || data.creditLimit) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    completionPercentage,
    createdByName,
    updatedByName: createdByName,
  };

  delete payload.ledgerName;
  delete payload.contactName;
  delete payload.contactNo;
  delete payload.gstNumber;
  delete payload.panNumber;
  delete payload.ifscCode;
  delete payload.creationDate;

  return await createPartyRepo(payload);
};

export const getPartiesService = async (userId, query = {}) => {
  return await findPartiesRepo(userId, {
    search: query.search || query.q || "",
    ledgerName: query.ledgerName || "",
    accountHead: query.accountHead || "",
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
    limit: query.limit || query.pageSize ? Number(query.limit || query.pageSize) : 50,
    page: query.page ? Number(query.page) : 1,
  });
};

export const getPartyByIdService = async (id, userId) => {
  const party = await findPartyByIdRepo(id, userId);
  if (!party) {
    const error = new Error("Ledger/Party not found.");
    error.statusCode = 404;
    throw error;
  }
  return party;
};

export const updatePartyService = async (id, userId, data, userDetails = {}) => {
  const existing = await findPartyByIdRepo(id, userId);
  if (!existing) {
    const error = new Error("Ledger/Party not found.");
    error.statusCode = 404;
    throw error;
  }

  const partyName = (data.partyName || data.ledgerName || existing.partyName).trim();
  if (partyName && partyName.toLowerCase() !== existing.partyName.toLowerCase()) {
    const duplicate = await findPartyByNameRepo(partyName, userId);
    if (duplicate && duplicate.id !== id) {
      throw new Error(`Another Ledger with name "${partyName}" already exists.`);
    }
  }

  const updateData = { ...data };
  if (data.logoUrl !== undefined) {
    updateData.logoUrl = await saveBase64Media(data.logoUrl, "ledger", `logo_${data.alias || existing.alias || "party"}`);
  }
  if (partyName) updateData.partyName = partyName;
  if (data.contactName) updateData.contactPerson = data.contactName;
  if (data.contactNo) updateData.phone = data.contactNo;
  if (data.gstNumber) updateData.gstin = data.gstNumber;
  if (data.panNumber) updateData.pan = data.panNumber;
  if (data.ifscCode) updateData.ifsc = data.ifscCode;

  if (data.joinDate || data.creationDate) {
    updateData.joinDate = parseSafeDate(data.joinDate || data.creationDate);
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
  if (data.creditDebitLimit !== undefined) {
    updateData.creditDebitLimit = Number(data.creditDebitLimit);
  }

  updateData.updatedByName = userDetails.fullName || userDetails.name || null;

  updateData.completionPercentage = calculateCompletion({
    partyName: updateData.partyName || existing.partyName,
    alias: updateData.alias || existing.alias,
    accountHead: updateData.accountHead || existing.accountHead,
    contactPerson: updateData.contactPerson || existing.contactPerson,
    email: updateData.email || existing.email,
    phone: updateData.phone || existing.phone,
    addressLine1: updateData.addressLine1 || existing.addressLine1,
    pincode: updateData.pincode || existing.pincode,
    city: updateData.city || existing.city,
    state: updateData.state || existing.state,
    gstin: updateData.gstin || existing.gstin,
    pan: updateData.pan || existing.pan,
    bankName: updateData.bankName || existing.bankName,
    accountNumber: updateData.accountNumber || existing.accountNumber,
    ifsc: updateData.ifsc || existing.ifsc,
    logoUrl: updateData.logoUrl || existing.logoUrl,
  });

  delete updateData.ledgerName;
  delete updateData.contactName;
  delete updateData.contactNo;
  delete updateData.gstNumber;
  delete updateData.panNumber;
  delete updateData.ifscCode;
  delete updateData.creationDate;

  return await updatePartyRepo(id, userId, updateData);
};

export const deletePartyService = async (id, userId) => {
  const existing = await findPartyByIdRepo(id, userId);
  if (!existing) {
    const error = new Error("Ledger/Party not found.");
    error.statusCode = 404;
    throw error;
  }
  return await deletePartyRepo(id, userId);
};

export const bulkImportPartiesService = async (userId, items = [], userDetails = {}) => {
  const userName = userDetails.fullName || userDetails.name || null;
  const processedItems = items.map((item) => {
    const partyName = (item.partyName || item.ledgerName || item["Ledger Name"] || "").trim();
    const accountCode = item.accountCode || item.code || item["Code"] || item.alias || item["Alias"] || generateAccountCode(partyName);
    const alias = item.alias || item["Alias"] || accountCode;
    const accountHead = item.accountHead || item["Account Head"] || "Sundry Debtors";
    const contactPerson = item.contactPerson || item.contactName || item["Contact Name"] || "";
    const gstin = item.gstin || item.gstNumber || item["GSTN"] || "";
    const email = item.email || item["Email"] || item["EMail Id"] || "";
    const phone = item.phone || item.contactNo || item["Contact No"] || "";

    return {
      userId,
      partyName,
      accountCode,
      alias,
      accountHead,
      contactPerson,
      gstin: gstin === "-" ? null : gstin,
      email: email === "Not specified" ? null : email,
      phone,
      addressLine1: item.addressLine1 || item["Address 1"] || "",
      city: item.city || item["City"] || "",
      state: item.state || item["State"] || "",
      country: item.country || item["Country"] || "India",
      pincode: item.pincode || item["Pincode"] || "",
      openingBalance: Number(item.openingBalance || item["Opening Balance"]) || 0,
      balanceType: item.balanceType || item["Balance Type"] || "Credit",
      billDueDays: Number(item.billDueDays || item["Bill Due Days"]) || 0,
      creditLimit: Number(item.creditLimit || item["Credit Limit"]) || 0,
      debitLimit: Number(item.debitLimit || item["Debit Limit"]) || 0,
      bankName: item.bankName || item["Bank Name"] || "",
      accountNumber: item.accountNumber || item["Account No"] || "",
      ifsc: item.ifsc || item["IFSC Code"] || "",
      isActive: true,
      joinDate: parseSafeDate(item.joinDate || item.creationDate || item["Creation Date"]),
      createdByName: userName,
      updatedByName: userName,
    };
  }).filter((item) => Boolean(item.partyName));

  return await bulkCreatePartiesRepo(processedItems);
};
