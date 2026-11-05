import fs from "fs/promises";
import path from "path";
import { getUserProfileFolderDir } from "../utils/userProfileNasPath.js";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../validations/userManagement.validation.js";
import {
  getManagedUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  updateUserStatusService,
  deleteUserService,
  getUserDropdownOptionsService,
  saveUserDropdownOptionService,
} from "../services/userManagement.service.js";

export const getUsers = async (req, res) => {
  try {
    const { search, sort, page, limit } = req.query;

    const result = await getManagedUsersService({
      requestingUser: req.user,
      search,
      sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      data: result.users,
      pagination: {
        total: result.total,
        page: Number(page) || 1,
        limit: Number(limit) || 16,
        totalPages: Math.ceil(result.total / (Number(limit) || 16)),
      },
    });
  } catch (error) {
    const status = error.message.includes("Access denied") ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getUserByIdService({
      id,
      requestingUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      data: user,
    });
  } catch (error) {
    const status = error.message.includes("Access denied")
      ? 403
      : error.message.includes("not found")
      ? 404
      : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body);

    const newUser = await createUserService({
      requestingUser: req.user,
      data: validatedData,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: newUser,
    });
  } catch (error) {
    const status = error.message.includes("Access denied") ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);

    const updatedUser = await updateUserService({
      id,
      requestingUser: req.user,
      data: validatedData,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    const status = error.message.includes("Access denied") ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = updateUserStatusSchema.parse(req.body);

    const updatedUser = await updateUserStatusService({
      id,
      requestingUser: req.user,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
      data: updatedUser,
    });
  } catch (error) {
    const status = error.message.includes("Access denied") ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadUserPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No photo file provided.",
      });
    }

    const { firstName, middleName, lastName } = req.body;
    const nameParts = [firstName, middleName, lastName]
      .filter(Boolean)
      .map((part) => String(part).trim().replace(/\s+/g, "_"))
      .filter(Boolean);

    const folderName =
      nameParts.length > 0
        ? nameParts.join("_")
        : (req.user?.fullName ? req.user.fullName.trim().replace(/\s+/g, "_") : `user_${Date.now()}`);

    const safeFolderName = folderName.replace(/[\\/:*?"<>|]/g, "_").replace(/_+/g, "_").trim();
    const uploadDir = getUserProfileFolderDir(safeFolderName);

    const ext = path.extname(req.file.originalname) || ".png";
    const fileName = `avatar_${Date.now()}_${Math.round(Math.random() * 1000)}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, req.file.buffer);

    const nasRoot = (process.env.NAS_USER_PROFILE_IMAGE_ROOT_PATH || "/mnt/qnap-vms/user-profile-image")
      .replace(/\\/g, "/")
      .replace(/\/+$/, "");
    const nasUrl = `${nasRoot}/${safeFolderName}/${fileName}`;

    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const previewUrl = `${baseUrl}/uploads/user-profile-image/${encodeURIComponent(safeFolderName)}/${fileName}`;

    return res.status(200).json({
      success: true,
      message: "Photo uploaded successfully.",
      secure_url: nasUrl,
      nas_url: nasUrl,
      preview_url: previewUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDropdownOptions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const options = await getUserDropdownOptionsService(userId);
    return res.status(200).json({
      success: true,
      message: "Dropdown options fetched successfully.",
      data: options,
    });
  } catch (error) {
    next(error);
  }
};

export const saveUserDropdownOption = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const option = await saveUserDropdownOptionService(userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Dropdown option saved successfully.",
      data: option,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUserService({
      requestingUser: req.user,
      id,
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    const status = error.message.includes("Access denied")
      ? 403
      : error.message.includes("not found")
      ? 404
      : 400;

    return res.status(status).json({
      success: false,
      message: error.message || "Failed to delete user.",
    });
  }
};

