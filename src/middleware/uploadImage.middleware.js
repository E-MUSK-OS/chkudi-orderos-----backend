import multer from "multer";

const storage = multer.memoryStorage();

const uploadImage = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for images
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Invalid file format. Only image files are allowed."));
    }

    cb(null, true);
  },
});

export default uploadImage;
