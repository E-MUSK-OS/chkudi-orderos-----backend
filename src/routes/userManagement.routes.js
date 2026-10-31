import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
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

router.get("/", verifyJWT, requirePermission("settings/manage-users", "read"), getUsers);
router.get("/:id", verifyJWT, requirePermission("settings/manage-users", "read"), getUserById);
router.post("/", verifyJWT, requirePermission("settings/manage-users", "create"), createUser);
router.patch("/:id", verifyJWT, requirePermission("settings/manage-users", "update"), updateUser);
router.patch("/:id/status", verifyJWT, requirePermission("settings/manage-users", "update"), updateUserStatus);
router.delete("/:id", verifyJWT, requirePermission("settings/manage-users", "delete"), deleteUser);
router.post("/upload-photo", verifyJWT, uploadImage.single("file"), uploadUserPhoto);

export default router;

