import jwt from "jsonwebtoken";

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

export const generatePasswordResetToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_RESET_PASSWORD_SECRET, {
    expiresIn: "10m",
  });
};

export const verifyPasswordResetToken = (token) => {
  return jwt.verify(token, process.env.JWT_RESET_PASSWORD_SECRET);
};
