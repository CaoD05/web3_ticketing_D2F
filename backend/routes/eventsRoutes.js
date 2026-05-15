const express = require("express");
const {
  getAllEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  cancelEvent,
} = require("../controllers/eventsController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.get("/events", getAllEvents);

// Admin/Organizer — tạo sự kiện
router.post("/events", verifyToken, requireRole("admin", "organizer"), createEvent);

// Admin/Organizer — cập nhật sự kiện
router.put("/events/:id", verifyToken, requireRole("admin", "organizer"), updateEvent);

// Admin only — xóa sự kiện (chỉ khi chưa bán vé)
router.delete("/events/:id", verifyToken, requireRole("admin"), deleteEvent);

// Admin/Organizer — hủy sự kiện
router.patch("/events/:id/cancel", verifyToken, requireRole("admin", "organizer"), cancelEvent);

// Public — Route có param /:id ĐẶT CUỐI CÙNG
router.get("/events/:id", getEventById);

module.exports = router;
