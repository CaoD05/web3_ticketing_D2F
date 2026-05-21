const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// Public
router.get("/tickets", ticketController.getTickets);
router.get("/tickets/my-tickets", ticketController.getMyTickets);
router.get("/tickets/resale", ticketController.getResaleTickets);

// Protected — cần đăng nhập
router.post("/tickets", ticketController.createTicket);
router.post("/tickets/transfer", verifyToken, ticketController.transferTicket);
router.post("/tickets/list-resale", verifyToken, ticketController.listForResale);
router.post("/tickets/buy-resale", verifyToken, ticketController.buyResale);

// Admin/Organizer — soát vé
router.post("/checkin", verifyToken, requireRole("admin", "organizer"), ticketController.checkin);

// Public — metadata (param route ĐẶT CUỐI)
router.get("/metadata/:tokenId", ticketController.getTicketMetadata);

module.exports = router;
