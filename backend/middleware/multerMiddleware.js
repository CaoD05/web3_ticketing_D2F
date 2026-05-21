const multer = require("multer");

// Danh sách MIME types được chấp nhận
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Base multer configuration
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type không hợp lệ: ${file.mimetype}. Chỉ chấp nhận: ${ALLOWED_MIME_TYPES.join(", ")}`
        ),
        false
      );
    }
  },
});

/**
 * Error handling wrapper for multer
 */
function handleMulterError(multerAction) {
  return (req, res, next) => {
    multerAction(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            ok: false,
            message: `File quá lớn. Giới hạn: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          });
        }
        return res.status(400).json({
          ok: false,
          message: `Upload error: ${err.message}`,
        });
      }

      if (err) {
        return res.status(400).json({
          ok: false,
          message: err.message,
        });
      }

      next();
    });
  };
}

// Export middleware functions
const multerMiddleware = handleMulterError(upload.single("image"));
multerMiddleware.single = (fieldName) => handleMulterError(upload.single(fieldName));
multerMiddleware.fields = (fields) => handleMulterError(upload.fields(fields));
multerMiddleware.array = (fieldName, maxCount) => handleMulterError(upload.array(fieldName, maxCount));

module.exports = multerMiddleware;
