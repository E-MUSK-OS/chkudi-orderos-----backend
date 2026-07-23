import { operatorLoginSchema } from "../validations/operatorAuth.validation.js";
import {
  operatorLoginService,
  getOperatorProfileService,
  operatorLogoutService,
  heartbeatService,
} from "../services/operatorAuth.service.js";

export const operatorLogin = async (req, res, next) => {
  try {
    const { employeeCode, password } = operatorLoginSchema.parse(req.body);

    const result = await operatorLoginService(employeeCode, password);

    return res.status(200).json({
      success: true,
      message: "Operator login successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOperatorProfile = async (req, res, next) => {
  try {
    const profile = await getOperatorProfileService(req.operator);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const operatorLogout = async (req, res, next) => {
  try {
    await operatorLogoutService(req.operator.id);

    return res.status(200).json({
      success: true,
      message: "Operator logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const heartbeat = async (req, res, next) => {
  try {
    await heartbeatService(req.operator);

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};
