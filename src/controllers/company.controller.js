import {
  getCompaniesService,
  getCompanyByIdService,
  createCompanyDraftService,
  createCompanyService,
  updateCompanyService,
  toggleCompanyStatusService,
  deleteCompanyService,
} from "../services/company.service.js";
import {
  createCompanyDraftSchema,
  createCompanySchema,
  updateCompanySchema,
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
