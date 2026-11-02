import {
  findCompaniesRepo,
  findCompanyByIdRepo,
  findCompanyByGstRepo,
  createCompanyRepo,
  updateCompanyRepo,
  toggleCompanyStatusRepo,
  deleteCompanyRepo,
} from "../repositories/company.repository.js";
import { saveBase64Media } from "../utils/companyMediaNasPath.js";

// Standard GST State code mapping
const GST_STATE_MAP = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

export const parseGstDetails = (gstNumber) => {
  if (!gstNumber || gstNumber.length < 2) {
    return { stateCode: "24", state: "Gujarat", panNumber: null };
  }
  const cleanGst = gstNumber.trim().toUpperCase();
  const stateCode = cleanGst.substring(0, 2);
  const state = GST_STATE_MAP[stateCode] || "Gujarat";
  const panNumber = cleanGst.length >= 12 ? cleanGst.substring(2, 12) : null;

  return { stateCode, state, panNumber };
};

export const getCompaniesService = async (userId, query = {}) => {
  const result = await findCompaniesRepo(userId, query);
  return result;
};

export const getCompanyByIdService = async (id, userId) => {
  const company = await findCompanyByIdRepo(id, userId);
  if (!company) {
    throw new Error("Company not found.");
  }
  return company;
};

export const createCompanyDraftService = async (userId, data) => {
  const gst = data.gstNumber.trim().toUpperCase();
  const existing = await findCompanyByGstRepo(gst, userId);
  if (existing) {
    throw new Error(`A company with GST number "${gst}" already exists.`);
  }

  const { stateCode, state, panNumber } = parseGstDetails(gst);

  const companyNameVal = data.companyName ? data.companyName.trim() : `Company (${gst.substring(0, 8)}...)`;
  const codeVal = data.companyCode
    ? data.companyCode.trim().toUpperCase()
    : companyNameVal && companyNameVal.length <= 6
    ? companyNameVal.toUpperCase()
    : panNumber
    ? panNumber.substring(0, 4)
    : "COMP";

  const draftData = {
    companyName: companyNameVal,
    legalName: data.companyName ? data.companyName.trim() : null,
    brandName: data.companyName ? data.companyName.trim() : null,
    companyCode: codeVal,
    abbreviation: codeVal,
    ownerName: data.ownerName || "",
    gstNumber: gst,
    panNumber: panNumber,
    stateCode,
    state,
    status: "DRAFT",
    isDefault: false,
  };

  return await createCompanyRepo(userId, draftData);
};

export const createCompanyService = async (userId, data) => {
  const gst = data.gstNumber.trim().toUpperCase();
  const existing = await findCompanyByGstRepo(gst, userId);
  if (existing) {
    throw new Error(`A company with GST number "${gst}" already exists.`);
  }

  const parsed = parseGstDetails(gst);

  const logoUrl = await saveBase64Media(data.logoUrl, "company", `logo_${data.companyCode || "comp"}`);
  const signatureUrl = await saveBase64Media(data.signatureUrl, "company", `sig_${data.companyCode || "comp"}`);

  return await createCompanyRepo(userId, {
    ...data,
    logoUrl,
    signatureUrl,
    gstNumber: gst,
    panNumber: data.panNumber || parsed.panNumber,
    stateCode: data.stateCode || parsed.stateCode,
    state: data.state || parsed.state,
  });
};

export const updateCompanyService = async (id, userId, data) => {
  const current = await findCompanyByIdRepo(id, userId);
  if (!current) {
    throw new Error("Company not found.");
  }

  const compCode = data.companyCode || current.companyCode || "comp";
  if (data.logoUrl !== undefined) {
    data.logoUrl = await saveBase64Media(data.logoUrl, "company", `logo_${compCode}`);
  }
  if (data.signatureUrl !== undefined) {
    data.signatureUrl = await saveBase64Media(data.signatureUrl, "company", `sig_${compCode}`);
  }

  if (data.gstNumber && data.gstNumber.trim().toUpperCase() !== current.gstNumber) {
    const nextGst = data.gstNumber.trim().toUpperCase();
    const existing = await findCompanyByGstRepo(nextGst, userId);
    if (existing && existing.id !== id) {
      throw new Error(`Another company with GST number "${nextGst}" already exists.`);
    }
    const parsed = parseGstDetails(nextGst);
    data.gstNumber = nextGst;
    if (!data.panNumber) data.panNumber = parsed.panNumber;
    if (!data.stateCode) data.stateCode = parsed.stateCode;
    if (!data.state) data.state = parsed.state;
  }

  return await updateCompanyRepo(id, userId, data);
};

export const toggleCompanyStatusService = async (id, userId) => {
  return await toggleCompanyStatusRepo(id, userId);
};

export const deleteCompanyService = async (id, userId) => {
  const current = await findCompanyByIdRepo(id, userId);
  if (!current) {
    throw new Error("Company not found.");
  }
  return await deleteCompanyRepo(id, userId);
};
