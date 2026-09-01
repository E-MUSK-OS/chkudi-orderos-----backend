import bcrypt from "bcrypt";

import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from "uuid";
import {
  findOperatorByEmployeeCode,
  updateOperatorHeartbeat,
} from "../repositories/operatorAuth.repository.js";
import { generateAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

export const operatorLoginService = async (userId, employeeCode, password) => {
  const operator = await findOperatorByEmployeeCode(userId, employeeCode);

  if (!operator) {
    throw new AppError("Invalid employee code or password.", 401);
  }
  if (!operator.isActive) {
    throw new AppError("Operator account is inactive.", 403);
  }

  if (!operator.user.isActive) {
    throw new AppError("Account is inactive.", 403);
  }

  const isPasswordValid = await bcrypt.compare(password, operator.password);

  if (!isPasswordValid) {
    throw new Error("Invalid employee code or password.", 401);
  }

  if (operator.sessionId && operator.lastSeen) {
    const now = new Date();

    const diff = now.getTime() - new Date(operator.lastSeen).getTime();

    // const diffMinutes = diff / 1000 / 60;
    const diffSeconds = diff / 1000;

    // Session Still Active
    if (diffSeconds < 30) {
      throw new Error("This operator is already busy.", 409);
    }

    // Session Expired
    await prisma.operator.update({
      where: {
        id: operator.id,
      },
      data: {
        sessionId: null,
        lastSeen: null,
        isLoggedIn: false,
      },
    });
  }

  const sessionId = uuidv4();

  await prisma.operator.update({
    where: {
      id: operator.id,
    },
    data: {
      isLoggedIn: true,
      sessionId,
      lastSeen: new Date(),
    },
  });

  const accessToken = generateAccessToken({
    id: operator.id,
    userId: operator.userId,
    employeeCode: operator.employeeCode,
    sessionId,
    type: "operator",
  });

  return {
    accessToken,

    operator: {
      id: operator.id,
      operatorName: operator.operatorName,
      employeeCode: operator.employeeCode,
    },
  };
};

export const getOperatorProfileService = async (operator) => {
  return {
    id: operator.id,
    operatorName: operator.operatorName,
    employeeCode: operator.employeeCode,
    isActive: operator.isActive,

    admin: {
      id: operator.user.id,
      fullName: operator.user.fullName,
      email: operator.user.email,
    },

    createdAt: operator.createdAt,
    updatedAt: operator.updatedAt,
  };
};

export const operatorLogoutService = async (operatorId) => {
  await prisma.operator.update({
    where: {
      id: operatorId,
    },
    data: {
      isLoggedIn: false,
      sessionId: null,
      lastSeen: null,
    },
  });

  return true;
};

export const heartbeatService = async (operator) => {
  await updateOperatorHeartbeat(operator.id, operator.sessionId);

  return true;
};
