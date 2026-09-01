import {
  getProfileById,
  updateProfile,
} from "../repositories/profile.repository.js";

export const getProfileService = async (userId) => {

  const user = await getProfileById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const updateProfileService = async (
  userId,
  data
) => {

  return await updateProfile(
    userId,
    data
  );
};