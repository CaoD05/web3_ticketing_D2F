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
 * Multer middleware — nhận file ảnh từ frontend
 *
 * - Lưu file trong memory (buffer) — không ghi vào ổ cứng
 * - Giới hạn 5MB
 * - Chỉ chấp nhận: jpeg, png, webp, gif
 * - Field name: "image"
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

// Middleware cho single file upload với field name "image"
const uploadSingle = upload.single("image");

/**
 * Wrapper để bắt lỗi multer và trả JSON thay vì crash
 */
function multerMiddleware(req, res, next) {
  uploadSingle(req, res, (err) => {
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
}

module.exports = multerMiddleware;
