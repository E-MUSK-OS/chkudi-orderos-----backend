import {
  getProfileService,
  updateProfileService,
} from "../services/profile.service.js";

import { updateProfileSchema } from "../validations/profile.validation.js";

export const getProfile = async (req, res) => {
  try {
    const user = await getProfileService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await updateProfileService(req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
