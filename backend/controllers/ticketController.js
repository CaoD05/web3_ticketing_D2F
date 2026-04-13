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

    // ─── Socket.io: Bắn thông báo real-time cho tất cả client đang kết nối ───
    const io = req.app.get("io");
    if (io) {
      io.emit("newTicketPurchased", {
        message: "🎉 Một vé mới vừa được phát hành!",
        ticket: createdTicket,
      });
    }

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

async function checkin(req, res) {
  try {
    const { tokenId, ownerWallet } = req.body;

    if (!tokenId || !ownerWallet) {
      return res.status(400).json({
        ok: false,
        message: "tokenId và ownerWallet là bắt buộc",
      });
    }

    const updatedTicket = await ticketModel.checkinTicket(tokenId, ownerWallet);

    return res.status(200).json({
      ok: true,
      message: "Check-in thành công",
      data: updatedTicket,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

async function getMyTickets(req, res) {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        ok: false,
        message: "Vui lòng cung cấp địa chỉ ví",
      });
    }

    const tickets = await ticketModel.getTicketsByWallet(wallet);

    return res.status(200).json({
      ok: true,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch my tickets",
      error: error.message,
    });
  }
}

async function getTicketMetadata(req, res) {
  try {
    const { tokenId } = req.params;

    const ticket = await ticketModel.getMetadata(tokenId);

    // Chuẩn ERC-721: trả về TRỰC TIẾP object metadata, không bọc trong { data: ... }
    return res.status(200).json({
      name: `Vé: ${ticket.EventName || "Sự kiện"}`,
      description: `Vé NFT tham gia sự kiện. Token ID: ${ticket.TokenID}`,
      image: "https://bafybeicg2rozgkjwjmfm7aerffs3ebpcmzwsumfyxsqcczm6ydac3k3bi4.ipfs.dweb.link/ticket.png",
      attributes: [
        {
          trait_type: "Used",
          value: ticket.IsUsed === true || ticket.IsUsed === 1 ? true : false,
        },
      ],
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      message: error.message,
    });
  }
}

module.exports = {
  createTicket,
  getTickets,
  checkin,
  getMyTickets,
  getTicketMetadata,
};
