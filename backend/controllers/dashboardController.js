const prisma = require("../utils/prismaClient");

// ─── GET /api/dashboard/stats ────────────────────────────────────────────────
// Tổng quan hệ thống (Admin only)
async function getStats(_req, res) {
  try {
    const [
      totalUsers,
      totalEvents,
      totalTickets,
      totalOrders,
      ticketsUsed,
      totalCheckins,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.ticket.count(),
      prisma.order.count(),
      prisma.ticket.count({ where: { IsUsed: true } }),
      prisma.checkIn.count(),
    ]);

    // Tổng doanh thu
    const revenueResult = await prisma.order.aggregate({
      _sum: { TotalAmount: true },
      where: { Status: { not: "cancelled" } },
    });
    const totalRevenue = revenueResult._sum.TotalAmount || 0;

    // Sự kiện active (chưa kết thúc)
    const activeEvents = await prisma.event.count({
      where: {
        EventDate: { gt: new Date() },
        EventName: { not: { startsWith: "[CANCELLED]" } },
      },
    });

    // User theo role
    const usersByRole = await prisma.user.groupBy({
      by: ["Role"],
      _count: { UserID: true },
    });

    const roleMap = {};
    usersByRole.forEach((r) => {
      roleMap[r.Role || "user"] = r._count.UserID;
    });

    return res.status(200).json({
      ok: true,
      data: {
        totalUsers,
        totalEvents,
        activeEvents,
        totalTickets,
        ticketsUsed,
        totalOrders,
        totalRevenue: Number(totalRevenue),
        totalCheckins,
        usersByRole: roleMap,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
}

// ─── GET /api/dashboard/sales ────────────────────────────────────────────────
// Doanh thu theo ngày (Admin only) — mặc định 30 ngày gần nhất
async function getSales(req, res) {
  try {
    const days = Number(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        OrderDate: { gte: startDate },
        Status: { not: "cancelled" },
      },
      select: {
        OrderDate: true,
        TotalAmount: true,
      },
      orderBy: { OrderDate: "asc" },
    });

    // Group by date
    const salesByDate = {};
    orders.forEach((o) => {
      const date = o.OrderDate
        ? o.OrderDate.toISOString().split("T")[0]
        : "unknown";
      if (!salesByDate[date]) {
        salesByDate[date] = { date, revenue: 0, orders: 0 };
      }
      salesByDate[date].revenue += Number(o.TotalAmount || 0);
      salesByDate[date].orders += 1;
    });

    return res.status(200).json({
      ok: true,
      data: Object.values(salesByDate),
      period: { days, from: startDate.toISOString().split("T")[0] },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch sales data",
      error: error.message,
    });
  }
}

// ─── GET /api/dashboard/events/:id/stats ─────────────────────────────────────
// Thống kê chi tiết cho 1 sự kiện (Admin/Organizer)
async function getEventStats(req, res) {
  try {
    const eventId = Number(req.params.id);
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ ok: false, message: "Invalid Event ID" });
    }

    const event = await prisma.event.findUnique({
      where: { EventID: eventId },
      include: {
        TicketTypes: {
          include: {
            _count: { select: { Tickets: true } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    // Tổng vé đã bán qua DB
    const totalSold = await prisma.ticket.count({
      where: { TicketType: { EventID: eventId } },
    });

    const totalUsed = await prisma.ticket.count({
      where: { TicketType: { EventID: eventId }, IsUsed: true },
    });

    const totalCheckins = await prisma.checkIn.count({
      where: { Ticket: { TicketType: { EventID: eventId } } },
    });

    // Doanh thu cho sự kiện này
    const ticketIds = await prisma.ticket.findMany({
      where: { TicketType: { EventID: eventId } },
      select: { OrderID: true },
    });
    const orderIds = [...new Set(ticketIds.map((t) => t.OrderID).filter(Boolean))];

    let eventRevenue = 0;
    if (orderIds.length > 0) {
      const revResult = await prisma.order.aggregate({
        _sum: { TotalAmount: true },
        where: { OrderID: { in: orderIds } },
      });
      eventRevenue = Number(revResult._sum.TotalAmount || 0);
    }

    // Thống kê theo loại vé
    const ticketTypeStats = event.TicketTypes.map((tt) => ({
      TicketTypeID: tt.TicketTypeID,
      TypeName: tt.TypeName,
      Price: tt.Price,
      Quantity: tt.Quantity,
      Sold: tt._count.Tickets,
      Available: tt.Quantity ? tt.Quantity - tt._count.Tickets : null,
    }));

    return res.status(200).json({
      ok: true,
      data: {
        EventID: event.EventID,
        EventName: event.EventName,
        EventDate: event.EventDate,
        TotalTickets: event.TotalTickets,
        totalSold,
        totalUsed,
        totalCheckins,
        eventRevenue,
        ticketTypeStats,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch event stats",
      error: error.message,
    });
  }
}

// ─── GET /api/checkins ───────────────────────────────────────────────────────
// Lịch sử check-in (Admin/Organizer)
async function getCheckins(req, res) {
  try {
    const { eventId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (eventId) {
      where.Ticket = { TicketType: { EventID: Number(eventId) } };
    }

    const [checkins, total] = await Promise.all([
      prisma.checkIn.findMany({
        where,
        include: {
          Ticket: {
            select: {
              TicketID: true,
              TokenID: true,
              OwnerWallet: true,
              TicketType: {
                select: {
                  TypeName: true,
                  Event: { select: { EventID: true, EventName: true } },
                },
              },
            },
          },
        },
        orderBy: { CheckInTime: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.checkIn.count({ where }),
    ]);

    return res.status(200).json({
      ok: true,
      data: checkins,
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
      message: "Failed to fetch check-ins",
      error: error.message,
    });
  }
}

// ─── GET /api/checkins/stats ─────────────────────────────────────────────────
// Thống kê check-in theo sự kiện
async function getCheckinStats(_req, res) {
  try {
    const events = await prisma.event.findMany({
      select: {
        EventID: true,
        EventName: true,
        TotalTickets: true,
        TicketsSold: true,
      },
    });

    const stats = await Promise.all(
      events.map(async (event) => {
        const totalCheckins = await prisma.checkIn.count({
          where: { Ticket: { TicketType: { EventID: event.EventID } } },
        });
        const totalTickets = await prisma.ticket.count({
          where: { TicketType: { EventID: event.EventID } },
        });

        return {
          EventID: event.EventID,
          EventName: event.EventName,
          TotalTickets: totalTickets,
          CheckedIn: totalCheckins,
          CheckInRate: totalTickets > 0
            ? Math.round((totalCheckins / totalTickets) * 100)
            : 0,
        };
      })
    );

    return res.status(200).json({
      ok: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch check-in stats",
      error: error.message,
    });
  }
}

module.exports = {
  getStats,
  getSales,
  getEventStats,
  getCheckins,
  getCheckinStats,
};
