import {
  getFieldGroupsService,
  getFieldOptionsService,
  createOptionService,
  updateOptionService,
  toggleOptionActiveService,
  deleteOptionService,
  seedAllSettingMasterDefaultsService,
} from "../services/settingMasters.service.js";

export const seedAllSettingMasterDefaults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const force = Boolean(req.body?.force);
    const result = await seedAllSettingMasterDefaultsService(userId, { force });
    return res.status(200).json({
      success: true,
      message: "Setting master defaults seeded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getFieldGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const groups = await getFieldGroupsService(userId);
    return res.status(200).json({
      success: true,
      message: "Field groups retrieved successfully",
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

export const getFieldOptions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { field } = req.query;
    if (!field) {
      return res.status(400).json({
        success: false,
        message: "Field query parameter is required",
      });
    }

    const options = await getFieldOptionsService(userId, field);
    return res.status(200).json({
      success: true,
      message: "Field options retrieved successfully",
      data: options,
    });
  } catch (error) {
    next(error);
  }
};

export const createOption = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { field, value, label } = req.body;

    if (!field || !value) {
      return res.status(400).json({
        success: false,
        message: "Field and value are required",
      });
    }

    const created = await createOptionService(userId, { field, value, label });
    return res.status(201).json({
      success: true,
      message: "Option created successfully",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOption = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { field, value, label, isActive, oldValue, oldLabel } = req.body;

    const updated = await updateOptionService(userId, id, { field, value, label, isActive, oldValue, oldLabel });
    return res.status(200).json({
      success: true,
      message: "Option updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleOptionActive = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { field, value, isActive } = req.body;

    const updated = await toggleOptionActiveService(userId, id, { field, value, isActive });
    return res.status(200).json({
      success: true,
      message: `Option marked as ${isActive ? "active" : "inactive"} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOption = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const field = req.query?.field || req.body?.field;
    const value = req.query?.value || req.body?.value;
    const label = req.query?.label || req.body?.label;

    await deleteOptionService(userId, id, { field, value, label });
    return res.status(200).json({
      success: true,
      message: "Option deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
