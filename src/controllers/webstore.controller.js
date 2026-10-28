import {
  getWebstoresService,
  getNextWebstoreCodeService,
  getWebstoreByIdService,
  createWebstoreService,
  updateWebstoreService,
  toggleWebstoreStatusService,
  deleteWebstoreService,
  testSpapiConnectionService,
} from "../services/webstore.service.js";
import {
  createWebstoreSchema,
  updateWebstoreSchema,
} from "../validations/webstore.validation.js";

export const getWebstores = async (req, res, next) => {
  try {
    const result = await getWebstoresService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Webstores fetched successfully.",
      data: result.webstores,
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

export const getNextWebstoreCode = async (req, res, next) => {
  try {
    const data = await getNextWebstoreCodeService(req.user.id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getWebstoreById = async (req, res, next) => {
  try {
    const data = await getWebstoreByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const createWebstore = async (req, res, next) => {
  try {
    const validated = createWebstoreSchema.parse(req.body);
    const store = await createWebstoreService(req.user.id, validated);
    return res.status(201).json({
      success: true,
      message: "Webstore created successfully.",
      data: store,
    });
  } catch (err) {
    next(err);
  }
};

export const updateWebstore = async (req, res, next) => {
  try {
    const validated = updateWebstoreSchema.parse(req.body);
    const store = await updateWebstoreService(
      req.params.id,
      req.user.id,
      validated
    );
    return res.status(200).json({
      success: true,
      message: "Webstore updated successfully.",
      data: store,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleWebstoreStatus = async (req, res, next) => {
  try {
    const store = await toggleWebstoreStatusService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: `Webstore status changed to ${store.isActive ? "Active" : "Inactive"}.`,
      data: store,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteWebstore = async (req, res, next) => {
  try {
    await deleteWebstoreService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Webstore deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

export const testSpapiConnection = async (req, res, next) => {
  try {
    const { spClientId, spClientSecret, refreshToken } = req.body;
    const result = await testSpapiConnectionService({
      spClientId,
      spClientSecret,
      refreshToken,
    });
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to verify Amazon SP-API connection.",
    });
  }
};

