import { Router } from "express";
import { uploadMediaImage } from "../controllers/mediaImage.controller.js";
import uploadImage from "../middleware/uploadImage.middleware.js";

const router = Router();

router.post("/upload-image", uploadImage.single("file"), uploadMediaImage);

export default router;
