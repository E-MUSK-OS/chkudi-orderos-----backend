import { verifyAccessToken } from "../utils/jwt.js";

import { findOperatorById } from "../repositories/operatorAuth.repository.js";


export const verifyOperatorJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyAccessToken(token);

    if (decoded.type !== "operator") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    const operator = await findOperatorById(decoded.id);

    if (!operator) {
      return res.status(401).json({
        success: false,
        message: "Operator not found.",
      });
    }

    if (!operator.isActive) {
      return res.status(403).json({
        success: false,
        message: "Operator account is inactive.",
      });
    }

    if (!operator.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    if (!operator.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    if (decoded.sessionId !== operator.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    req.operator = operator;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid access token.",
    });
  }
};