import {
  getRequestedPOsService,
  getLatestPoDatesService,
  getRequestedPOByIdService,
  upsertRequestedPOService,
  deleteRequestedPOService,
} from "../services/requestedPo.service.js";

export const getRequestedPOs = async (req, res, next) => {
  try {
    const result = await getRequestedPOsService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data: result.pos,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getLatestPoDates = async (req, res, next) => {
  try {
    const dates = await getLatestPoDatesService(req.user.id);
    return res.status(200).json({
      success: true,
      data: dates,
    });
  } catch (err) {
    next(err);
  }
};

export const getRequestedPOById = async (req, res, next) => {
  try {
    const po = await getRequestedPOByIdService(req.params.id, req.user.id);
    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found.",
      });
    }
    return res.status(200).json({
      success: true,
      data: po,
    });
  } catch (err) {
    next(err);
  }
};

export const createRequestedPO = async (req, res, next) => {
  try {
    const po = await upsertRequestedPOService(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      data: po,
      message: "Purchase order saved successfully.",
    });
  } catch (err) {
    next(err);
  }
};

export const updateRequestedPO = async (req, res, next) => {
  try {
    const po = await upsertRequestedPOService(req.user.id, {
      ...req.body,
      id: req.params.id,
    });
    return res.status(200).json({
      success: true,
      data: po,
      message: "Purchase order updated successfully.",
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRequestedPO = async (req, res, next) => {
  try {
    const result = await deleteRequestedPOService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

