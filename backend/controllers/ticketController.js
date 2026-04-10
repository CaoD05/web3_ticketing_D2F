const ticketModel = require("../models/ticketModel");

async function createTicket(req, res) {
  try {
    const {
      TicketTypeID,
      OrderID,
      OwnerWallet,
      SeatID,
      TokenID,
      TransactionHash,
      QRCode,
      IsUsed
    } = req.body;

    if (!OwnerWallet) {
      return res.status(400).json({
        ok: false,
        message: "OwnerWallet is required",
      });
    }

    const createdTicket = await ticketModel.createTicket({
      TicketTypeID,
      OrderID,
      OwnerWallet,
      SeatID,
      TokenID,
      TransactionHash,
      QRCode,
      IsUsed
    });

    return res.status(201).json({
      ok: true,
      message: "Ticket created successfully",
      data: createdTicket,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create ticket",
      error: error.message,
    });
  }
}

async function getTickets(req, res) {
  try {
    const tickets = await ticketModel.getTickets();
    return res.status(200).json({
      ok: true,
      message: "Tickets retrieved successfully",
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
}

module.exports = {
  createTicket,
  getTickets,
};
