const eventModel = require("../models/eventModel");

async function getAllEvents(_req, res) {
  try {
    const statusRaw = String(_req.query.status || "all").toLowerCase();
    const allowedStatuses = new Set(["all", "active", "cancelled"]);

    if (!allowedStatuses.has(statusRaw)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid status filter. Use: all | active | cancelled",
      });
    }

    const events = await eventModel.findAllEvents({ status: statusRaw });
    return res.status(200).json({
      ok: true,
      status: statusRaw,
      data: events,
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
      EventName,
      Description = null,
      EventDate = null,
      Location = null,
      ContractAddress = null,
      TotalTickets,
      TicketsSold = 0,
      IsCancelled = false,
      CreatedBy = null,
    } = req.body;

    if (!EventName || TotalTickets == null) {
      return res.status(400).json({
        ok: false,
        message: "EventName and TotalTickets are required",
      });
    }

    const parsedTotalTickets = Number(TotalTickets);
    if (!Number.isInteger(parsedTotalTickets) || parsedTotalTickets <= 0) {
      return res.status(400).json({
        ok: false,
        message: "TotalTickets must be a positive integer",
      });
    }

    const parsedTicketsSold = Number(TicketsSold);
    if (!Number.isInteger(parsedTicketsSold) || parsedTicketsSold < 0) {
      return res.status(400).json({
        ok: false,
        message: "TicketsSold must be a non-negative integer",
      });
    }

    const parsedEventDate = EventDate ? new Date(EventDate) : null;
    if (EventDate && Number.isNaN(parsedEventDate.getTime())) {
      return res.status(400).json({
        ok: false,
        message: "EventDate must be a valid datetime",
      });
    }

    const parsedCreatedBy = CreatedBy == null ? null : Number(CreatedBy);
    if (parsedCreatedBy != null && !Number.isInteger(parsedCreatedBy)) {
      return res.status(400).json({
        ok: false,
        message: "CreatedBy must be an integer",
      });
    }

    const parsedIsCancelled =
      typeof IsCancelled === "boolean"
        ? IsCancelled
        : String(IsCancelled).toLowerCase() === "true";

    const createdEvent = await eventModel.createEvent({
      EventName,
      Description,
      EventDate: parsedEventDate,
      Location,
      ContractAddress,
      TotalTickets: parsedTotalTickets,
      TicketsSold: parsedTicketsSold,
      IsCancelled: parsedIsCancelled,
      CreatedBy: parsedCreatedBy,
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

module.exports = {
  getAllEvents,
  createEvent,
};
