const prisma = require("../utils/prismaClient");
const { getSignerContract } = require("../services/web3");

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

    // 1. Verify on Blockchain first
    try {
      const contract = getSignerContract();
      const tx = await contract.verifyTicket(tokenId);
      await tx.wait();
      console.log(`[Check-in] Blockchain verification successful. Tx: ${tx.hash}`);
    } catch (bcError) {
      console.error("[Check-in] Blockchain verification failed:", bcError.message);
      return res.status(400).json({
        ok: false,
        message: "Xác minh trên Blockchain thất bại: " + (bcError.reason || bcError.message),
      });
    }

    // 2. Update Database
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
      return res.status(200).json({ ok: true, data: [] });
    }

    const tickets = await prisma.ticket.findMany({
      where: { 
        OwnerWallet: {
          equals: wallet,
          mode: 'insensitive'
        }
      },
      orderBy: { TicketID: 'desc' },
      include: {
        TicketType: {
          include: {
            Event: true
          }
        }
      }
    });

    // ─── Blockchain Verification ───
    // Filter out burned tickets by checking on-chain ownership
    let contract = null;
    try {
      const { getReadOnlyContract } = require("../services/web3");
      contract = getReadOnlyContract();
    } catch (e) {
      console.warn("[ticketController] RPC unavailable, skipping live verification");
    }

    const verifiedTickets = [];
    for (const t of tickets) {
      let isStillOwned = true;
      
      // If contract is available, check if token still exists and is owned by this wallet
      if (contract && t.TokenID) {
        try {
          const ownerOnChain = await contract.ownerOf(t.TokenID);
          if (ownerOnChain.toLowerCase() !== wallet.toLowerCase()) {
            isStillOwned = false;
          }
        } catch (err) {
          // If ownerOf reverts (e.g., token burned), mark as not owned
          isStillOwned = false; 
        }
      }

      if (isStillOwned) {
        let EventName = null;
        let EventDate = null;
        let BannerURL = null;
        let DetailURL = null;
        
        if (t.TicketType && t.TicketType.Event) {
           EventName = t.TicketType.Event.EventName;
           EventDate = t.TicketType.Event.EventDate;
           BannerURL = t.TicketType.Event.BannerURL;
           DetailURL = t.TicketType.Event.DetailURL;
        }
        
        verifiedTickets.push({
          ...t,
          EventName,
          EventDate,
          BannerURL,
          DetailURL,
          TicketType: undefined 
        });
      } else if (t.TokenID) {
          // Background Cleanup: If burned, update DB so we don't check again next time
          prisma.ticket.update({
              where: { TicketID: t.TicketID },
              data: { OwnerWallet: "0x0000000000000000000000000000000000000000" }
          }).catch(() => {});
      }
    }

    return res.status(200).json({
      ok: true,
      data: verifiedTickets,
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
// ─── POST /api/tickets/transfer ──────────────────────────────────────────────
// Chuyển nhượng vé cho user khác
async function transferTicket(req, res) {
  try {
    const { TicketID, ToWallet } = req.body;

    if (!TicketID || !ToWallet) {
      return res.status(400).json({
        ok: false,
        message: "TicketID and ToWallet are required",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { TicketID: Number(TicketID) },
      });

      if (!ticket) throw new Error("Ticket not found");
      if (ticket.IsUsed) throw new Error("Cannot transfer a used ticket");

      // Kiểm tra quyền: chỉ owner mới được chuyển
      const senderWallet = req.user?.walletAddress;
      if (senderWallet && ticket.OwnerWallet.toLowerCase() !== senderWallet.toLowerCase()) {
        throw new Error("You are not the owner of this ticket");
      }

      // Kiểm tra vé đang bán lại (có QRCode bắt đầu bằng RESALE:)
      if (ticket.QRCode && ticket.QRCode.startsWith("RESALE:")) {
        throw new Error("Cannot transfer a ticket that is listed for resale. Delist it first.");
      }

      return await tx.ticket.update({
        where: { TicketID: Number(TicketID) },
        data: { OwnerWallet: ToWallet },
      });
    });

    return res.status(200).json({
      ok: true,
      message: "Ticket transferred successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

// ─── POST /api/tickets/list-resale ───────────────────────────────────────────
// Đăng bán lại vé
async function listForResale(req, res) {
  try {
    const { TicketID, Price } = req.body;

    if (!TicketID || Price == null) {
      return res.status(400).json({
        ok: false,
        message: "TicketID and Price are required",
      });
    }

    const price = Number(Price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ ok: false, message: "Price must be positive" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { TicketID: Number(TicketID) },
    });

    if (!ticket) {
      return res.status(404).json({ ok: false, message: "Ticket not found" });
    }

    if (ticket.IsUsed) {
      return res.status(400).json({ ok: false, message: "Cannot resale a used ticket" });
    }

    // Đánh dấu vé đang bán lại bằng QRCode field
    const updated = await prisma.ticket.update({
      where: { TicketID: Number(TicketID) },
      data: { QRCode: `RESALE:${price}` },
    });

    return res.status(200).json({
      ok: true,
      message: `Ticket listed for resale at ${price}`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to list ticket for resale",
      error: error.message,
    });
  }
}

// ─── POST /api/tickets/buy-resale ────────────────────────────────────────────
// Mua vé đang bán lại
async function buyResale(req, res) {
  try {
    const userId = req.user.userId;
    const { TicketID, TxHash = null } = req.body;

    if (!TicketID) {
      return res.status(400).json({ ok: false, message: "TicketID is required" });
    }

    const user = await prisma.user.findUnique({
      where: { UserID: userId },
      select: { WalletAddress: true },
    });

    const buyerWallet = user?.WalletAddress || `user_${userId}`;

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { TicketID: Number(TicketID) },
      });

      if (!ticket) throw new Error("Ticket not found");
      if (!ticket.QRCode || !ticket.QRCode.startsWith("RESALE:")) {
        throw new Error("This ticket is not listed for resale");
      }
      if (ticket.OwnerWallet.toLowerCase() === buyerWallet.toLowerCase()) {
        throw new Error("Cannot buy your own ticket");
      }

      // Chuyển quyền sở hữu
      return await tx.ticket.update({
        where: { TicketID: Number(TicketID) },
        data: {
          OwnerWallet: buyerWallet,
          QRCode: null, // Xóa trạng thái resale
          TransactionHash: TxHash || ticket.TransactionHash,
        },
      });
    });

    return res.status(200).json({
      ok: true,
      message: "Resale ticket purchased successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

// ─── GET /api/tickets/resale ─────────────────────────────────────────────────
// Danh sách vé đang bán lại
async function getResaleTickets(req, res) {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        QRCode: { startsWith: "RESALE:" },
        IsUsed: false,
      },
      include: {
        TicketType: {
          include: {
            Event: {
              select: { EventID: true, EventName: true, EventDate: true, Location: true },
            },
          },
        },
      },
      orderBy: { TicketID: "desc" },
    });

    // Parse giá resale từ QRCode
    const result = tickets.map((t) => {
      const resalePrice = t.QRCode ? Number(t.QRCode.replace("RESALE:", "")) : 0;
      return {
        ...t,
        ResalePrice: resalePrice,
        EventName: t.TicketType?.Event?.EventName || null,
        EventDate: t.TicketType?.Event?.EventDate || null,
        Location: t.TicketType?.Event?.Location || null,
        TypeName: t.TicketType?.TypeName || null,
      };
    });

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch resale tickets",
      error: error.message,
    });
  }
}

module.exports = {
  createTicket,
  getTickets,
  checkin,
  getMyTickets,
  getTicketMetadata,
  transferTicket,
  listForResale,
  buyResale,
  getResaleTickets,
};
