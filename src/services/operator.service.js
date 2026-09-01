import {
  countOperatorsByUserId,
  createOperator,
  getOperatorsByUserId,
  getOperatorById,
  updateOperator,
  deleteOperator,
  findOperatorByEmployeeCode,
} from "../repositories/operator.repository.js";
import bcrypt from "bcrypt";
import { generateEmployeeCode } from "../utils/generateEmployeeCode.js";

export const createOperatorService = async (userId, data) => {
  const totalOperators = await countOperatorsByUserId(userId);

  if (totalOperators >= 5) {
    throw new Error(
      "Maximum limit reached. You can create up to 5 operators only.",
    );
  }

  const employeeCode = await generateEmployeeCode(data.operatorName);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return await createOperator({
    operatorName: data.operatorName,

    employeeCode,

    password: hashedPassword,

    userId,
  });
};

export const getAllOperatorsService = async (userId) => {
  return await getOperatorsByUserId(userId);
};

export const getOperatorByIdService = async (id, userId) => {
  const operator = await getOperatorById(id, userId);

  if (!operator) {
    throw new Error("Operator not found.");
  }

  return operator;
};

export const updateOperatorService = async (id, userId, data) => {
  const operator = await getOperatorById(id, userId);

  if (!operator) {
    throw new Error("Operator not found.");
  }

  // Check duplicate employee code
  if (data.employeeCode && data.employeeCode !== operator.employeeCode) {
    const existingOperator = await findOperatorByEmployeeCode(
      data.employeeCode,
      userId,
    );

    if (existingOperator) {
      throw new Error("Employee code already exists.");
    }
  }

  await updateOperator(id, data);

  return await getOperatorById(id, userId);
};

export const deleteOperatorService = async (id, userId) => {
  const operator = await getOperatorById(id, userId);

  if (!operator) {
    throw new Error("Operator not found.");
  }

  await deleteOperator(id, userId);

  return true;
};
