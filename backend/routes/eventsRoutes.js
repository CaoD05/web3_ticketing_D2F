const express = require("express");
const {
  getAllEvents,
  createEvent,
  getEventById,
} = require("../controllers/eventsController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/events", getAllEvents);
// Chỉ admin mới được tạo sự kiện
router.post("/events", verifyToken, requireRole("admin"), createEvent);

// Route lặp lại param /:id bắt buộc ĐẶT CUỐI CÙNG ở đáy file
router.get("/events/:id", getEventById);

module.exports = router;
