const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

router.post("/tickets", ticketController.createTicket);
router.get("/tickets", ticketController.getTickets);
router.get("/my-tickets", ticketController.getMyTickets);
// Chỉ admin hoặc organizer mới được soát vé
router.post("/checkin", verifyToken, requireRole("admin", "organizer"), ticketController.checkin);

// Đặt route có param /:tokenId CUỐI CÙNG để tránh xung đột
router.get("/metadata/:tokenId", ticketController.getTicketMetadata);

module.exports = router;
