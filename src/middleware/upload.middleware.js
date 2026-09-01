import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    const allowed = [
      "video/mp4",

      "video/webm",

      "video/quicktime",

      "video/x-msvideo",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid video format"));
    }

    cb(null, true);
  },
});

export default upload;