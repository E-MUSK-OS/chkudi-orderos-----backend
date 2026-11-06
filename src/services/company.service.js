import {
  findCompaniesRepo,
  findCompanyByIdRepo,
  findCompanyByGstRepo,
  createCompanyRepo,
  updateCompanyRepo,
  toggleCompanyStatusRepo,
  deleteCompanyRepo,
  createBranchRepo,
  findBranchesRepo,
  deleteBranchRepo,
  updateBranchStatusRepo,
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

export const PAN_ENTITY_MAP = {
  P: "Individual / Proprietor",
  C: "Company",
  H: "Hindu Undivided Family (HUF)",
  F: "Firm / Partnership",
  A: "Association of Persons (AOP)",
  B: "Body of Individuals (BOI)",
  T: "Trust",
  L: "Local Authority",
  J: "Artificial Juridical Person",
  G: "Government",
};

export const getBusinessTypeFromPan = (panOrGst) => {
  if (!panOrGst || typeof panOrGst !== "string") return null;
  const clean = panOrGst.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  let panChar = "";
  if (clean.length === 15) {
    panChar = clean.charAt(5);
  } else if (clean.length >= 4) {
    panChar = clean.charAt(3);
  }
  return PAN_ENTITY_MAP[panChar] || null;
};

export const parseGstDetails = (gstNumber) => {
  if (!gstNumber || gstNumber.length < 2) {
    return { stateCode: "24", state: "Gujarat", panNumber: null, businessType: null };
  }
  const cleanGst = gstNumber.trim().toUpperCase();
  const stateCode = cleanGst.substring(0, 2);
  const state = GST_STATE_MAP[stateCode] || "Gujarat";
  const panNumber = cleanGst.length >= 12 ? cleanGst.substring(2, 12) : null;
  const businessType = getBusinessTypeFromPan(cleanGst);

  return { stateCode, state, panNumber, businessType };
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

  const { stateCode, state, panNumber, businessType } = parseGstDetails(gst);

  let companyNameVal = "";
  if (data.companyName && data.companyName.trim()) {
    companyNameVal = data.companyName.trim();
  } else {
    companyNameVal = `Company (${gst.substring(0, 8)}...)`;
  }

  const codeVal = data.companyCode
    ? data.companyCode.trim().toUpperCase()
    : companyNameVal && companyNameVal.length <= 6
    ? companyNameVal.toUpperCase()
    : panNumber
    ? panNumber.substring(0, 4)
    : "COMP";

  const draftData = {
    companyName: companyNameVal,
    isBranch: false,
    parentCompanyId: null,
    companyBranchName: null,
    legalName: data.companyName ? data.companyName.trim() : null,
    brandName: data.companyName ? data.companyName.trim() : null,
    companyCode: codeVal,
    abbreviation: codeVal,
    businessType: data.businessType || businessType || "Individual / Proprietor",
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

export const createBranchService = async (userId, data) => {
  const companyId = data.companyId;
  const branchName = data.branchName ? data.branchName.trim() : "";
  const gstNumber = data.gstNumber ? data.gstNumber.trim().toUpperCase() : "";

  if (!companyId) {
    throw new Error("Company ID is required.");
  }
  if (!branchName) {
    throw new Error("Branch name is required.");
  }
  if (!gstNumber || gstNumber.length !== 15) {
    throw new Error("A valid 15-character GST number is required.");
  }

  const company = await findCompanyByIdRepo(companyId, userId);
  if (!company) {
    throw new Error("Parent company not found.");
  }

  const existingBranches = await findBranchesRepo(userId, companyId);
  const duplicateName = existingBranches.some(
    (b) => b.branchName.toLowerCase() === branchName.toLowerCase()
  );
  if (duplicateName) {
    throw new Error(`A branch named "${branchName}" already exists for this company.`);
  }

  const branch = await createBranchRepo({
    userId,
    companyId,
    branchName,
    gstNumber,
    status: data.status || "ACTIVE",
  });

  return {
    ...branch,
    companyName: company.companyName,
    displayName: `${company.companyName} - ${branchName}`,
  };
};

export const getBranchesService = async (userId, companyId = null) => {
  return await findBranchesRepo(userId, companyId);
};

export const deleteBranchService = async (id, userId) => {
  const deleted = await deleteBranchRepo(id, userId);
  if (!deleted) {
    throw new Error("Branch not found or could not be deleted.");
  }
  return deleted;
};

export const updateBranchStatusService = async (id, userId, status) => {
  const normStatus = (status || "").toUpperCase();
  if (normStatus !== "ACTIVE" && normStatus !== "INACTIVE") {
    throw new Error("Invalid status. Must be ACTIVE or INACTIVE.");
  }
  const updated = await updateBranchStatusRepo(id, userId, normStatus);
  if (!updated) {
    throw new Error("Branch not found or could not be updated.");
  }
  return updated;
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
    businessType: data.businessType || parsed.businessType || undefined,
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
    if (!data.businessType && parsed.businessType) data.businessType = parsed.businessType;
    if (!data.stateCode) data.stateCode = parsed.stateCode;
    if (!data.state) data.state = parsed.state;
  }

  return await updateCompanyRepo(id, userId, data);
};

export const toggleCompanyStatusService = async (id, userId, targetStatus) => {
  return await toggleCompanyStatusRepo(id, userId, targetStatus);
};

export const deleteCompanyService = async (id, userId) => {
  const current = await findCompanyByIdRepo(id, userId);
  if (!current) {
    throw new Error("Company not found.");
  }
  return await deleteCompanyRepo(id, userId);
};
