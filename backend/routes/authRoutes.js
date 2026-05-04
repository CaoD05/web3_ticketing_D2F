const express = require("express");
const {
  login,
  register,
  getMe,
  updateProfile,
  linkWallet,
  changePassword,
  googleLogin,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.post("/auth/login", login);
router.post("/auth/register", register);
router.post("/auth/google", googleLogin);

// Protected (cần JWT)
router.get("/auth/me", verifyToken, getMe);
router.put("/auth/profile", verifyToken, updateProfile);
router.put("/auth/link-wallet", verifyToken, linkWallet);
router.put("/auth/change-password", verifyToken, changePassword);

module.exports = router;
