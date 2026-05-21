const express = require("express");
const {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
} = require("../controllers/orderController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { orderLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// User — tạo đơn hàng (cần đăng nhập + rate limit)
router.post("/orders", verifyToken, orderLimiter, createOrder);

// User — đơn hàng của tôi
router.get("/my-orders", verifyToken, getMyOrders);

// Admin — tất cả đơn hàng
router.get("/orders", verifyToken, requireRole("admin"), getAllOrders);

// User/Admin — chi tiết đơn hàng (controller tự kiểm tra quyền)
router.get("/orders/:id", verifyToken, getOrderById);

module.exports = router;
