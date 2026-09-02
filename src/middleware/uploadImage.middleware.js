import multer from "multer";

const storage = multer.memoryStorage();

const uploadImage = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter(req, file, cb) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid image format"));
    }

    cb(null, true);
  },
});

export default uploadImage;
