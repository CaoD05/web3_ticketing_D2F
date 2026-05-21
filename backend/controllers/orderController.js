const prisma = require("../utils/prismaClient");
const { sendOrderConfirmation } = require("../services/emailService");

// ─── POST /api/orders ────────────────────────────────────────────────────────
// Tạo đơn hàng mới (User đã đăng nhập)
// Body: { TicketTypeID, Quantity?, TxHash? }
async function createOrder(req, res) {
  try {
    const userId = req.user.userId;
    const { TicketTypeID, Quantity = 1, TxHash = null } = req.body;

    if (!TicketTypeID) {
      return res.status(400).json({ ok: false, message: "TicketTypeID is required" });
    }

    const qty = Number(Quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 10) {
      return res.status(400).json({ ok: false, message: "Quantity must be 1-10" });
    }

    // Lấy thông tin loại vé + sự kiện
    const ticketType = await prisma.ticketType.findUnique({
      where: { TicketTypeID: Number(TicketTypeID) },
      include: { Event: true },
    });

    if (!ticketType) {
      return res.status(404).json({ ok: false, message: "Ticket type not found" });
    }

    if (!ticketType.Event) {
      return res.status(404).json({ ok: false, message: "Event not found for this ticket type" });
    }

    // Kiểm tra sự kiện đã hủy chưa
    if (ticketType.Event.EventName.startsWith("[CANCELLED]")) {
      return res.status(400).json({ ok: false, message: "This event has been cancelled" });
    }

    // Kiểm tra còn vé không
    if (ticketType.Quantity != null) {
      const soldCount = await prisma.ticket.count({
        where: { TicketTypeID: ticketType.TicketTypeID },
      });
      if (soldCount + qty > ticketType.Quantity) {
        return res.status(409).json({
          ok: false,
          message: `Not enough tickets. Available: ${ticketType.Quantity - soldCount}`,
        });
      }
    }

    // Lấy wallet của user
    const user = await prisma.user.findUnique({
      where: { UserID: userId },
      select: { WalletAddress: true },
    });

    const ownerWallet = user?.WalletAddress || `user_${userId}`;
    const unitPrice = ticketType.Price ? Number(ticketType.Price) : 0;
    const totalAmount = unitPrice * qty;

    // Tạo Order (Idempotent by TxHash if provided)
    const result = await prisma.$transaction(async (tx) => {
      // Check if order for this TxHash already exists
      if (TxHash) {
        const existing = await tx.order.findFirst({ where: { TxHash } });
        if (existing) return { order: existing, tickets: [] };
      }

      const order = await tx.order.create({
        data: {
          UserID: userId,
          TicketTypeID: Number(TicketTypeID),
          TotalAmount: totalAmount,
          Status: "pending", // Always start as pending
          TxHash: TxHash,
        },
      });

      // We no longer create Ticket records here. 
      // The Blockchain Listener will create them when it sees the TicketPurchased event.
      
      return { order, tickets: [] };
    });

    // Socket.io notification
    const io = req.app.get("io");
    if (io) {
      io.emit("newTicketPurchased", {
        message: `🎉 ${qty} vé mới vừa được mua!`,
        order: result.order,
      });
    }

    // ─── Gửi email xác nhận (async, không block response) ──────────────────
    const buyerInfo = await prisma.user.findUnique({
      where: { UserID: userId },
      select: { Email: true, FullName: true },
    });

    if (buyerInfo?.Email) {
      sendOrderConfirmation({
        toEmail: buyerInfo.Email,
        fullName: buyerInfo.FullName,
        eventName: ticketType.Event.EventName,
        orderId: result.order.OrderID,
        ticketCount: qty,
        eventDate: ticketType.Event.EventDate,
        location: ticketType.Event.Location,
        totalAmount: totalAmount > 0 ? `${totalAmount.toLocaleString()} VND` : null,
      }).catch((err) => console.error("[orderController] Email error:", err.message));
    }

    return res.status(201).json({
      ok: true,
      message: `Order created with ${qty} ticket(s)`,
      data: {
        order: result.order,
        tickets: result.tickets,
        event: {
          EventID: ticketType.Event.EventID,
          EventName: ticketType.Event.EventName,
        },
        ticketType: {
          TicketTypeID: ticketType.TicketTypeID,
          TypeName: ticketType.TypeName,
          Price: ticketType.Price,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
}

// ─── GET /api/orders ─────────────────────────────────────────────────────────
// Danh sách tất cả đơn hàng (Admin only)
async function getAllOrders(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.Status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          User: {
            select: { UserID: true, FullName: true, Email: true, WalletAddress: true },
          },
          Tickets: {
            select: { TicketID: true, TokenID: true, IsUsed: true, TicketTypeID: true },
          },
        },
        orderBy: { OrderDate: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    return res.status(200).json({
      ok: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
}

// ─── GET /api/my-orders ──────────────────────────────────────────────────────
// Đơn hàng của user hiện tại
async function getMyOrders(req, res) {
  try {
    const userId = req.user.userId;

    const orders = await prisma.order.findMany({
      where: { UserID: userId },
      include: {
        Tickets: {
          include: {
            TicketType: {
              include: { Event: { select: { EventID: true, EventName: true, EventDate: true } } },
            },
          },
        },
      },
      orderBy: { OrderDate: "desc" },
    });

    return res.status(200).json({
      ok: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch my orders",
      error: error.message,
    });
  }
}

// ─── GET /api/orders/:id ─────────────────────────────────────────────────────
// Chi tiết 1 đơn hàng
async function getOrderById(req, res) {
  try {
    const orderId = Number(req.params.id);
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ ok: false, message: "Invalid Order ID" });
    }

    const order = await prisma.order.findUnique({
      where: { OrderID: orderId },
      include: {
        User: {
          select: { UserID: true, FullName: true, Email: true, WalletAddress: true },
        },
        Tickets: {
          include: {
            TicketType: {
              include: { Event: { select: { EventID: true, EventName: true, EventDate: true, Location: true } } },
            },
            CheckIn: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    // Kiểm tra quyền: admin xem tất cả, user chỉ xem đơn của mình
    if (req.user.role !== "admin" && order.UserID !== req.user.userId) {
      return res.status(403).json({ ok: false, message: "Access denied" });
    }

    return res.status(200).json({
      ok: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
}

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
};
