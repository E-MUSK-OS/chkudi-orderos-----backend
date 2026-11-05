import {
  getCompaniesService,
  getCompanyByIdService,
  createCompanyDraftService,
  createBranchService,
  getBranchesService,
  deleteBranchService,
  updateBranchStatusService,
  createCompanyService,
  updateCompanyService,
  toggleCompanyStatusService,
  deleteCompanyService,
} from "../services/company.service.js";
import {
  createCompanyDraftSchema,
  createCompanySchema,
  updateCompanySchema,
  createCompanyBranchSchema,
} from "../validations/company.validation.js";

export const getCompanies = async (req, res, next) => {
  try {
    const result = await getCompaniesService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Companies fetched successfully.",
      data: result.companies,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getCompanyById = async (req, res, next) => {
  try {
    const company = await getCompanyByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

export const createCompanyDraft = async (req, res, next) => {
  try {
    const validated = createCompanyDraftSchema.parse(req.body);
    const draft = await createCompanyDraftService(req.user.id, validated);
    return res.status(201).json({
      success: true,
      message: "Company draft created successfully.",
      data: draft,
    });
  } catch (err) {
    next(err);
  }
};

export const createCompany = async (req, res, next) => {
  try {
    const validated = createCompanySchema.parse(req.body);
    const company = await createCompanyService(req.user.id, validated);
    return res.status(201).json({
      success: true,
      message: "Company created successfully.",
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const validated = updateCompanySchema.parse(req.body);
    const updated = await updateCompanyService(
      req.params.id,
      req.user.id,
      validated
    );
    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleCompanyStatus = async (req, res, next) => {
  try {
    const company = await toggleCompanyStatusService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: `Company status changed to ${company.status}.`,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    await deleteCompanyService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Company deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   Company Branches
   ========================================================================== */

export const createCompanyBranch = async (req, res, next) => {
  try {
    const validated = createCompanyBranchSchema.parse(req.body);
    const companyId = req.params.id || validated.companyId;
    const branch = await createBranchService(req.user.id, {
      ...validated,
      companyId,
    });
    return res.status(201).json({
      success: true,
      message: "Branch created successfully.",
      data: branch,
    });
  } catch (err) {
    next(err);
  }
};

export const getBranches = async (req, res, next) => {
  try {
    const branches = await getBranchesService(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Branches fetched successfully.",
      data: branches,
    });
  } catch (err) {
    next(err);
  }
};

export const getCompanyBranches = async (req, res, next) => {
  try {
    const branches = await getBranchesService(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: "Company branches fetched successfully.",
      data: branches,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCompanyBranch = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.params.id;
    await deleteBranchService(branchId, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

export const updateCompanyBranchStatus = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.params.id;
    const { status } = req.body;
    const branch = await updateBranchStatusService(branchId, req.user.id, status);
    return res.status(200).json({
      success: true,
      message: `Branch status updated to ${branch.status}.`,
      data: branch,
    });
  } catch (err) {
    next(err);
  }
};
