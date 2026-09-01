import cloudinary from "../config/cloudinary.js";

export const deleteVideoFromCloudinary = async (publicId) => {
  if (!publicId) return;

  return await cloudinary.uploader.destroy(publicId, {
    resource_type: "video",
  });
};