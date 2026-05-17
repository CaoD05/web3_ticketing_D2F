const express = require("express");
const {
  login,
  register,
  getMe,
  connectWallet,
  googleAuth,
  getNonce,
  changePassword,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.post("/auth/login", login);
router.post("/auth/register", register);
router.post("/auth/google", googleAuth);

// Protected (cần JWT)
router.get("/auth/me", verifyToken, getMe);
router.get("/auth/nonce", verifyToken, getNonce);
router.put("/auth/connect-wallet", verifyToken, connectWallet);
router.put("/auth/link-wallet", verifyToken, connectWallet);
router.post("/auth/connect-wallet", verifyToken, connectWallet);
router.put("/auth/change-password", verifyToken, changePassword);

module.exports = router;
