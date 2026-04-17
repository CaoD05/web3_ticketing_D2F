const prisma = require("../utils/prismaClient");

async function getAllEvents(_req, res) {
  try {
    const events = await prisma.event.findMany({
      orderBy: [
        { CreatedAt: 'desc' },
        { EventID: 'desc' }
      ]
    });

    const now = new Date();
    const formattedEvents = events.map(event => ({
      ...event,
      Status: (event.EventDate && new Date(event.EventDate) > now) ? 'Active' : 'Ended'
    }));

    return res.status(200).json({
      ok: true,
      data: formattedEvents,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
}

async function createEvent(req, res) {
  try {
    const {
      EventName, Description = null, EventDate = null, Location = null, ContractAddress = null,
      TotalTickets, TicketsSold = 0, CreatedBy = null,
    } = req.body;

    if (!EventName || TotalTickets == null) {
      return res.status(400).json({ ok: false, message: "EventName and TotalTickets are required" });
    }

    const parsedTotalTickets = Number(TotalTickets);
    if (!Number.isInteger(parsedTotalTickets) || parsedTotalTickets <= 0) {
      return res.status(400).json({ ok: false, message: "TotalTickets must be a positive integer" });
    }

    const parsedTicketsSold = Number(TicketsSold);
    if (!Number.isInteger(parsedTicketsSold) || parsedTicketsSold < 0) {
      return res.status(400).json({ ok: false, message: "TicketsSold must be a non-negative integer" });
    }

    const parsedEventDate = EventDate ? new Date(EventDate) : null;
    if (EventDate && Number.isNaN(parsedEventDate.getTime())) {
      return res.status(400).json({ ok: false, message: "EventDate must be a valid datetime" });
    }

    const parsedCreatedBy = CreatedBy == null ? null : Number(CreatedBy);
    if (parsedCreatedBy != null && !Number.isInteger(parsedCreatedBy)) {
      return res.status(400).json({ ok: false, message: "CreatedBy must be an integer" });
    }

    const createdEvent = await prisma.event.create({
      data: {
        EventName,
        Description,
        EventDate: parsedEventDate,
        Location,
        ContractAddress,
        TotalTickets: parsedTotalTickets,
        TicketsSold: parsedTicketsSold,
        CreatedBy: parsedCreatedBy,
      }
    });

    return res.status(201).json({
      ok: true,
      message: "Event created successfully",
      data: createdEvent,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to create event",
      error: error.message,
    });
  }
}

async function getEventById(req, res) {
  try {
    const eventId = req.params.id;
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ ok: false, message: "Invalid Event ID" });
    }

    const event = await prisma.event.findUnique({
      where: { EventID: Number(eventId) }
    });
    
    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const now = new Date();
    const eventWithStatus = {
      ...event,
      Status: (event.EventDate && new Date(event.EventDate) > now) ? 'Active' : 'Ended'
    };

    return res.status(200).json({
      ok: true,
      data: eventWithStatus,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch event",
      error: error.message,
    });
  }
}

module.exports = {
  getAllEvents,
  createEvent,
  getEventById,
};
