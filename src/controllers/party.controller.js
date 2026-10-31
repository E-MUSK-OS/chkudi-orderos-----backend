import {
  createPartyService,
  getPartiesService,
  getPartyByIdService,
  updatePartyService,
  deletePartyService,
  bulkImportPartiesService,
} from "../services/party.service.js";
import {
  createPartySchema,
  updatePartySchema,
} from "../validations/party.validation.js";

export const createParty = async (req, res, next) => {
  try {
    const data = createPartySchema.parse(req.body);
    const party = await createPartyService(req.user.id, data, req.user);

    return res.status(201).json({
      success: true,
      message: "Ledger created successfully.",
      data: party,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllParties = async (req, res, next) => {
  try {
    const result = await getPartiesService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Ledgers fetched successfully.",
      data: result.parties,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / (result.limit || 50)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPartyById = async (req, res, next) => {
  try {
    const party = await getPartyByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: party,
    });
  } catch (error) {
    next(error);
  }
};

export const updateParty = async (req, res, next) => {
  try {
    const data = updatePartySchema.parse(req.body);
    const updated = await updatePartyService(req.params.id, req.user.id, data, req.user);

    return res.status(200).json({
      success: true,
      message: "Ledger updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteParty = async (req, res, next) => {
  try {
    await deletePartyService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Ledger deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportParties = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body.items || req.body.parties || []);
    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No ledger items provided for import.",
      });
    }

    const imported = await bulkImportPartiesService(req.user.id, items, req.user);
    return res.status(201).json({
      success: true,
      message: `Successfully imported ${imported.length} ledgers.`,
      data: imported,
    });
  } catch (error) {
    next(error);
  }
};
