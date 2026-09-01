import {
  createOperatorService,
  getAllOperatorsService,
  getOperatorByIdService,
  updateOperatorService,
  deleteOperatorService,
} from "../services/operator.service.js";

import {
  createOperatorSchema,
  updateOperatorSchema,
} from "../validations/operator.validation.js";

// ======================================================
// Create Operator
// ======================================================

export const createOperator = async (req, res, next) => {
  try {
    const data = createOperatorSchema.parse(req.body);

    const operator = await createOperatorService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Operator created successfully.",
      data: operator,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Operators
// ======================================================

export const getAllOperators = async (req, res, next) => {
  try {
    const operators = await getAllOperatorsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: operators,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Operator By Id
// ======================================================

export const getOperatorById = async (req, res, next) => {
  try {
    const operator = await getOperatorByIdService(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      data: operator,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Operator
// ======================================================

export const updateOperator = async (req, res, next) => {
  try {
    const data = updateOperatorSchema.parse(req.body);

    const operator = await updateOperatorService(
      req.params.id,
      req.user.id,
      data
    );

    return res.status(200).json({
      success: true,
      message: "Operator updated successfully.",
      data: operator,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Operator
// ======================================================

export const deleteOperator = async (req, res, next) => {
  try {
    await deleteOperatorService(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Operator deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};