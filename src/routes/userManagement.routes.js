import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import uploadImage from "../middleware/uploadImage.middleware.js";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  uploadUserPhoto,
  getUserDropdownOptions,
  saveUserDropdownOption,
} from "../controllers/userManagement.controller.js";

const router = Router();

router.get("/dropdown-options", verifyJWT, getUserDropdownOptions);
router.post("/dropdown-options", verifyJWT, saveUserDropdownOption);

router.get("/", verifyJWT, getUsers);
router.get("/:id", verifyJWT, getUserById);
router.post("/", verifyJWT, createUser);
router.patch("/:id", verifyJWT, updateUser);
router.patch("/:id/status", verifyJWT, updateUserStatus);
router.delete("/:id", verifyJWT, deleteUser);
router.post("/upload-photo", verifyJWT, uploadImage.single("file"), uploadUserPhoto);

export default router;

