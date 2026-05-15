const express = require("express");
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUserRole,
  deleteUser,
} = require("../controllers/usersController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin only — tất cả user management đều cần admin role
router.get("/users", verifyToken, requireRole("admin"), getAllUsers);
router.get("/users/:id", verifyToken, requireRole("admin"), getUserById);
router.post("/users", verifyToken, requireRole("admin"), createUser);
router.put("/users/:id/role", verifyToken, requireRole("admin"), updateUserRole);
router.delete("/users/:id", verifyToken, requireRole("admin"), deleteUser);

module.exports = router;
