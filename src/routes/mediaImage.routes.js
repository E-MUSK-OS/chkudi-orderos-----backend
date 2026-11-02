import { Router } from "express";
import { uploadMediaImage, uploadCompanyMedia } from "../controllers/mediaImage.controller.js";
import uploadImage from "../middleware/uploadImage.middleware.js";

const router = Router();

router.post("/upload-image", uploadImage.single("file"), uploadMediaImage);
router.post("/upload-company-media", uploadImage.single("file"), uploadCompanyMedia);

export default router;
