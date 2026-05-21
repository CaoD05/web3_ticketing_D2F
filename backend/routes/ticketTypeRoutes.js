const express = require("express");
const {
  createTicketType,
  getTicketTypesByEvent,
  updateTicketType,
  deleteTicketType,
} = require("../controllers/ticketTypeController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Public — xem loại vé của sự kiện
router.get("/events/:eventId/ticket-types", getTicketTypesByEvent);

// Admin/Organizer — quản lý loại vé
router.post("/events/:eventId/ticket-types", verifyToken, requireRole("admin", "organizer"), createTicketType);
router.put("/ticket-types/:id", verifyToken, requireRole("admin", "organizer"), updateTicketType);
router.delete("/ticket-types/:id", verifyToken, requireRole("admin", "organizer"), deleteTicketType);

module.exports = router;
