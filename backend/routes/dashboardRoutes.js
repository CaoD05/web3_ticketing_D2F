const express = require("express");
const {
  getStats,
  getSales,
  getEventStats,
  getCheckins,
  getCheckinStats,
} = require("../controllers/dashboardController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin only
router.get("/dashboard/stats", verifyToken, requireRole("admin"), getStats);
router.get("/dashboard/sales", verifyToken, requireRole("admin"), getSales);

// Admin/Organizer
router.get("/dashboard/events/:id/stats", verifyToken, requireRole("admin", "organizer"), getEventStats);
router.get("/checkins", verifyToken, requireRole("admin", "organizer"), getCheckins);
router.get("/checkins/stats", verifyToken, requireRole("admin", "organizer"), getCheckinStats);

module.exports = router;
