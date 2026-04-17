const prisma = require("../utils/prismaClient");

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
      return res.status(400).json({ ok: false, message: "OwnerWallet is required" });
    }

    const createdTicket = await prisma.ticket.create({
      data: {
        TicketTypeID,
        OrderID,
        OwnerWallet,
        SeatID,
        TokenID,
        TransactionHash,
        QRCode,
        IsUsed: IsUsed === undefined ? false : IsUsed,
      }
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
    const tickets = await prisma.ticket.findMany();
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

    // Thực hiện prisma.$transaction để đảm bảo data consistency cho Checkin
    const updatedTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { TokenID: tokenId, OwnerWallet: ownerWallet }
      });

      if (!ticket) {
        throw new Error("Vé không tồn tại hoặc ví này không sở hữu vé");
      }

      if (ticket.IsUsed === true) {
        throw new Error("Vé này đã được sử dụng để check-in trước đó");
      }

      return await tx.ticket.update({
        where: { TicketID: ticket.TicketID },
        data: { IsUsed: true }
      });
    });

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
      return res.status(400).json({ ok: false, message: "Vui lòng cung cấp địa chỉ ví" });
    }

    const tickets = await prisma.ticket.findMany({
      where: { OwnerWallet: wallet },
      orderBy: { TicketID: 'desc' },
      include: {
        TicketType: {
          include: {
            Event: true
          }
        }
      }
    });

    const parsedTickets = tickets.map(t => {
      let EventName = null;
      let EventDate = null;
      
      // Fallback in case relation wasn't properly established
      if (t.TicketType && t.TicketType.Event) {
         EventName = t.TicketType.Event.EventName;
         EventDate = t.TicketType.Event.EventDate;
      }
      
      return {
        ...t,
        EventName,
        EventDate,
        TicketType: undefined // Remove nested property to match old format
      };
    });

    return res.status(200).json({
      ok: true,
      data: parsedTickets,
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

    const ticket = await prisma.ticket.findFirst({
      where: { TokenID: tokenId },
      include: {
        TicketType: {
          include: {
            Event: true
          }
        }
      }
    });

    if (!ticket) {
      throw new Error("Vé không tồn tại");
    }

    let EventName = "Sự kiện";
    if (ticket.TicketType && ticket.TicketType.Event && ticket.TicketType.Event.EventName) {
      EventName = ticket.TicketType.Event.EventName;
    }

    return res.status(200).json({
      name: `Vé: ${EventName}`,
      description: `Vé NFT tham gia sự kiện. Token ID: ${ticket.TokenID}`,
      image: "https://bafybeicg2rozgkjwjmfm7aerffs3ebpcmzwsumfyxsqcczm6ydac3k3bi4.ipfs.dweb.link/ticket.png",
      attributes: [
        {
          trait_type: "Used",
          value: ticket.IsUsed === true ? true : false,
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
