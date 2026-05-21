const prisma = require("../utils/prismaClient");

// ─── POST /api/events/:eventId/ticket-types ──────────────────────────────────
// Tạo loại vé cho sự kiện (Admin/Organizer)
async function createTicketType(req, res) {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ ok: false, message: "Invalid Event ID" });
    }

    const event = await prisma.event.findUnique({
      where: { EventID: eventId },
    });

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const { TypeName, Price, Quantity } = req.body;

    if (!TypeName) {
      return res.status(400).json({ ok: false, message: "TypeName is required" });
    }

    const parsedPrice = Price != null ? Number(Price) : null;
    if (parsedPrice != null && (isNaN(parsedPrice) || parsedPrice < 0)) {
      return res.status(400).json({ ok: false, message: "Price must be a non-negative number" });
    }

    const parsedQuantity = Quantity != null ? Number(Quantity) : null;
    if (parsedQuantity != null && (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0)) {
      return res.status(400).json({ ok: false, message: "Quantity must be a positive integer" });
    }

    const created = await prisma.ticketType.create({
      data: {
        EventID: eventId,
        TypeName,
        Price: parsedPrice,
        Quantity: parsedQuantity,
      },
    });

    return res.status(201).json({
      ok: true,
      message: "Ticket type created successfully",
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create ticket type",
      error: error.message,
    });
  }
}

// ─── GET /api/events/:eventId/ticket-types ───────────────────────────────────
// Xem danh sách loại vé của sự kiện
async function getTicketTypesByEvent(req, res) {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ ok: false, message: "Invalid Event ID" });
    }

    const ticketTypes = await prisma.ticketType.findMany({
      where: { EventID: eventId },
      include: {
        _count: { select: { Tickets: true } },
      },
      orderBy: { TicketTypeID: "asc" },
    });

    // Thêm trường sold vào mỗi ticket type
    const result = ticketTypes.map((tt) => ({
      ...tt,
      Sold: tt._count?.Tickets || 0,
      _count: undefined,
    }));

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch ticket types",
      error: error.message,
    });
  }
}

// ─── PUT /api/ticket-types/:id ───────────────────────────────────────────────
// Cập nhật loại vé
async function updateTicketType(req, res) {
  try {
    const ttId = Number(req.params.id);
    if (!ttId || isNaN(ttId)) {
      return res.status(400).json({ ok: false, message: "Invalid TicketType ID" });
    }

    const existing = await prisma.ticketType.findUnique({
      where: { TicketTypeID: ttId },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Ticket type not found" });
    }

    const { TypeName, Price, Quantity } = req.body;
    const data = {};

    if (TypeName !== undefined) data.TypeName = TypeName;

    if (Price !== undefined) {
      const n = Number(Price);
      if (isNaN(n) || n < 0) {
        return res.status(400).json({ ok: false, message: "Price must be a non-negative number" });
      }
      data.Price = n;
    }

    if (Quantity !== undefined) {
      const n = Number(Quantity);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ ok: false, message: "Quantity must be a positive integer" });
      }
      data.Quantity = n;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ ok: false, message: "No fields to update" });
    }

    const updated = await prisma.ticketType.update({
      where: { TicketTypeID: ttId },
      data,
    });

    return res.status(200).json({
      ok: true,
      message: "Ticket type updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to update ticket type",
      error: error.message,
    });
  }
}

// ─── DELETE /api/ticket-types/:id ────────────────────────────────────────────
// Xóa loại vé (chỉ khi chưa có vé nào được bán)
async function deleteTicketType(req, res) {
  try {
    const ttId = Number(req.params.id);
    if (!ttId || isNaN(ttId)) {
      return res.status(400).json({ ok: false, message: "Invalid TicketType ID" });
    }

    const existing = await prisma.ticketType.findUnique({
      where: { TicketTypeID: ttId },
      include: { _count: { select: { Tickets: true } } },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Ticket type not found" });
    }

    if (existing._count.Tickets > 0) {
      return res.status(409).json({
        ok: false,
        message: "Cannot delete ticket type that already has tickets sold",
      });
    }

    await prisma.ticketType.delete({ where: { TicketTypeID: ttId } });

    return res.status(200).json({
      ok: true,
      message: "Ticket type deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to delete ticket type",
      error: error.message,
    });
  }
}

module.exports = {
  createTicketType,
  getTicketTypesByEvent,
  updateTicketType,
  deleteTicketType,
};
