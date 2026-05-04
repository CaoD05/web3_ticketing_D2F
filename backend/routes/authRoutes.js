const express = require("express");
const router = express.Router();
const { login, register, getMe } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/auth/login — Đăng nhập bằng ví hoặc email/password, nhận JWT
router.post("/auth/login", login);

// POST /api/auth/register — Đăng ký người dùng mới bằng email + mật khẩu
router.post("/auth/register", register);

// GET /api/auth/me — Xem thông tin người dùng hiện tại (cần token)
router.get("/auth/me", verifyToken, getMe);

module.exports = router;
