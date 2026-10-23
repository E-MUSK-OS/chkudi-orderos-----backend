import { verifyAccessToken } from "../utils/jwt.js";
import { findUserById } from "../repositories/auth.repository.js";
import { findOperatorById } from "../repositories/operatorAuth.repository.js";

/**
 * Unified authentication middleware for VMS endpoints.
 * Supports both standard User JWT tokens (Admin) and Operator JWT tokens.
 */
export const verifyVmsAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (decoded.type === "operator") {
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

      if (operator.user && !operator.user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Admin account is inactive.",
        });
      }

      req.operator = operator;
      req.user = operator.user;
      req.userId = operator.userId;
      return next();
    }

    // Standard User / Admin token
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive.",
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been locked.",
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};
