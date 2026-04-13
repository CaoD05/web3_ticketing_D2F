const express = require("express");
const router = express.Router();
const { login, getMe } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/auth/login — Đăng nhập bằng ví, nhận JWT
router.post("/auth/login", login);

// GET /api/auth/me — Xem thông tin người dùng hiện tại (cần token)
router.get("/auth/me", verifyToken, getMe);

module.exports = router;
