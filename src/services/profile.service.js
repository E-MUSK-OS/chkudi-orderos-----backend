import {
  getProfileById,
  updateProfile,
} from "../repositories/profile.repository.js";
import { findUserByEmailOrUsername } from "../repositories/userManagement.repository.js";

export const getProfileService = async (userId) => {
  const user = await getProfileById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const updateProfileService = async (userId, data) => {
  const payload = { ...data };

  if (payload.email) {
    const cleanEmail = payload.email.toLowerCase().trim();
    const existing = await findUserByEmailOrUsername(cleanEmail, null);
    if (existing && existing.id !== userId) {
      throw new Error("A user with this email address already exists.");
    }
    payload.email = cleanEmail;
  }

  if (payload.fullName) {
    const parts = payload.fullName.trim().split(/\s+/);
    payload.firstName = parts[0] || "";
    payload.lastName = parts.slice(1).join(" ") || parts[0] || "";
    payload.fullName = payload.fullName.trim();
  }

  return await updateProfile(userId, payload);
};
