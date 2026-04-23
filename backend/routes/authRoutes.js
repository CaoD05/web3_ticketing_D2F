const express = require("express");
const router = express.Router();
const { login, register, googleAuth, connectWallet, getMe } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// POST /api/auth/login — Đăng nhập bằng email + mật khẩu, nhận JWT
router.post("/auth/login", login);

// POST /api/auth/register — Đăng ký người dùng mới bằng email + mật khẩu
router.post("/auth/register", register);

// POST /api/auth/google — Đăng nhập hoặc đăng ký bằng Google
router.post("/auth/google", googleAuth);

// POST /api/auth/connect-wallet — Liên kết MetaMask sau khi đăng nhập
router.post("/auth/connect-wallet", verifyToken, connectWallet);

// GET /api/auth/me — Xem thông tin người dùng hiện tại (cần token)
router.get("/auth/me", verifyToken, getMe);

module.exports = router;
