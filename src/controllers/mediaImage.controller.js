import fs from "fs/promises";
import path from "path";
import { saveBufferMedia } from "../utils/companyMediaNasPath.js";

export const uploadMediaImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    // req.file is populated by multer.
    // Ensure public/uploads/labels exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "labels");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `label_img_${Date.now()}_${Math.round(Math.random() * 1000)}${path.extname(req.file.originalname)}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, req.file.buffer);

    // Return a URL that can be used to access the image.
    const fileUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/uploads/labels/${fileName}`;

    return res.status(200).json({
      success: true,
      secure_url: fileUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to upload any Company Profile, Employee Profile, or Ledger Book media directly to NAS
 */
export const uploadCompanyMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No media file provided." });
    }

    const subfolder = req.body.subfolder || req.query.subfolder || "general";
    const prefix = req.body.prefix || req.query.prefix || "media";

    const relativeUrl = await saveBufferMedia(
      req.file.buffer,
      req.file.originalname,
      subfolder,
      prefix
    );

    return res.status(200).json({
      success: true,
      url: relativeUrl,
      secure_url: relativeUrl,
      message: "Media uploaded to storage successfully.",
    });
  } catch (error) {
    next(error);
  }
};
