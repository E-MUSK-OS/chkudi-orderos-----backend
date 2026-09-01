import multer from "multer";

const storage = multer.memoryStorage();

const excelUpload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter(req, file, cb) {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only Excel (.xlsx, .xls) files are allowed."));
    }

    cb(null, true);
  },
});

export default excelUpload; 