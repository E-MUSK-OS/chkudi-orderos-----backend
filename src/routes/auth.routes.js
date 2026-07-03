import { Router } from "express";
import {
  signup,
  login,
  logout,
  refreshToken,
  getMe,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  resendOtp,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOtp);

router.get("/me", verifyJWT, getMe);

export default router;
