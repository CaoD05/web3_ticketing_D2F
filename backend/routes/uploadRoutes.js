const express = require("express");
const { uploadImage } = require("../controllers/uploadController");
const { verifyToken } = require("../middleware/authMiddleware");
const multerMiddleware = require("../middleware/multerMiddleware");
const { uploadLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// POST /api/upload — Upload ảnh lên Supabase Storage
// Yêu cầu: đăng nhập + rate limit + file ảnh (max 5MB)
router.post("/upload", verifyToken, uploadLimiter, multerMiddleware, uploadImage);

module.exports = router;
