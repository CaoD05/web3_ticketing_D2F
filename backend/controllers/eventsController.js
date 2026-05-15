const prisma = require("../utils/prismaClient");
const { ethers } = require("ethers");
const { getReadOnlyContract } = require("../services/web3");

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";
const IPFS_GATEWAY_FALLBACK = "https://ipfs.io/ipfs";
const metaImageCache = new Map();

function toWeiString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    return trimmed;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      return null;
    }
    return String(value);
  }

  try {
    const asString = value.toString();
    if (!/^\d+$/.test(asString)) {
      return null;
    }
    return asString;
  } catch {
    return null;
  }
}

function mapPriceFields(event, priceWei) {
  if (!priceWei) {
    return {
      ...event,
      priceWei: null,
      priceEth: null,
    };
  }

  return {
    ...event,
    priceWei,
    priceEth: ethers.formatEther(priceWei),
  };
}

function buildMetaUrlCandidates(metaURL) {
  if (!metaURL || typeof metaURL !== "string") {
    return [];
  }

  const trimmed = metaURL.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("http")) {
    return [trimmed];
  }

  return [`${PINATA_GATEWAY}/${trimmed}`, `${IPFS_GATEWAY_FALLBACK}/${trimmed}`];
}

function normalizeImageCid(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("ipfs://")) {
    return trimmed.slice("ipfs://".length);
  }

  if (trimmed.startsWith("http")) {
    const marker = "/ipfs/";
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex >= 0) {
      return trimmed.slice(markerIndex + marker.length);
    }
  }

  return trimmed;
}

async function fetchImageCidFromMeta(metaURL) {
  if (!metaURL) {
    return null;
  }

  if (metaImageCache.has(metaURL)) {
    return metaImageCache.get(metaURL);
  }

  const urlCandidates = buildMetaUrlCandidates(metaURL);
  for (const url of urlCandidates) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        continue;
      }

      const metaJson = await response.json();
      const imageCid = normalizeImageCid(metaJson?.image);
      if (imageCid) {
        metaImageCache.set(metaURL, imageCid);
        return imageCid;
      }
    } catch {
      // Try next gateway candidate.
    }
  }

  metaImageCache.set(metaURL, null);
  return null;
}

async function attachMetaImageCid(event) {
  const storedImageCid = normalizeImageCid(event.ImageURL);
  if (storedImageCid) {
    return {
      ...event,
      ImageURL: storedImageCid,
    };
  }

  if (!event.MetaURL) {
    return {
      ...event,
      ImageURL: null,
    };
  }

  const imageCid = await fetchImageCidFromMeta(event.MetaURL);
  if (!imageCid) {
    return {
      ...event,
      ImageURL: null,
    };
  }

  try {
    await prisma.event.update({
      where: {
        EventID: event.EventID,
      },
      data: {
        ImageURL: imageCid,
      },
    });
  } catch {
    // Non-fatal: still return hydrated response.
  }

  return {
    ...event,
    ImageURL: imageCid,
  };
}

async function attachOnChainPrice(contract, event) {
  try {
    const onChainEvent = await contract.events(event.EventID);
    const onChainPriceWei = toWeiString(onChainEvent?.price);
    if (onChainPriceWei) {
      return mapPriceFields(event, onChainPriceWei);
    }
  } catch {
    // Fallback to database price if RPC call fails.
  }

  return mapPriceFields(event, toWeiString(event.Price));
}
const { scrapeImageFromLink } = require("../utils/metadataHelper");

async function getAllEvents(_req, res) {
  try {
    let contract = null;
    try {
      contract = getReadOnlyContract();
    } catch {
      contract = null;
    }
    const events = await prisma.event.findMany({
      orderBy: [
        { CreatedAt: 'desc' },
        { EventID: 'desc' }
      ]
    });

    const now = new Date();
    const formattedEvents = await Promise.all(
      events.map(async (event) => {
        const baseEvent = {
          ...event,
          Status: (event.EventDate && new Date(event.EventDate) > now) ? 'Active' : 'Ended'
        };

        const withPrice = await attachOnChainPrice(contract, baseEvent);
        return attachMetaImageCid(withPrice);
      })
    );

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
      EventName,
      MetaURL = null,
      metaURL,
      Description,
      Price,
      priceWei,
      ImageURL,
      imageURL,
      EventDate = null,
      Location = null,
      ContractAddress = null,
      TotalTickets, TicketsSold = 0, CreatedBy = null,
      ImageUrl = null, ExternalLink = null,
    } = req.body;

    const resolvedMetaURL = MetaURL ?? metaURL ?? Description ?? null;
    const resolvedPriceWei = toWeiString(priceWei ?? Price);
    const resolvedImageCid =
      normalizeImageCid(ImageURL ?? imageURL) ??
      (await fetchImageCidFromMeta(resolvedMetaURL));

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

    // ─── Auto-fill ảnh từ ExternalLink nếu ImageUrl trống ────────────────────
    let finalImageUrl = ImageUrl || null;
    if (!finalImageUrl && ExternalLink) {
      console.log(`[eventsController] 🔍 ImageUrl trống, cào ảnh từ: ${ExternalLink}`);
      finalImageUrl = await scrapeImageFromLink(ExternalLink);
    }

    const createdEvent = await prisma.event.create({
      data: {
        EventName,
        MetaURL: resolvedMetaURL,
        ImageURL: resolvedImageCid,
        Price: resolvedPriceWei,
        EventDate: parsedEventDate,
        Location,
        ImageUrl: finalImageUrl,
        ExternalLink: ExternalLink || null,
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
    let contract = null;
    try {
      contract = getReadOnlyContract();
    } catch {
      contract = null;
    }
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

    const enrichedEvent = await attachOnChainPrice(contract, eventWithStatus);
    const enrichedEventWithImage = await attachMetaImageCid(enrichedEvent);

    return res.status(200).json({
      ok: true,
      data: enrichedEventWithImage,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch event",
      error: error.message,
    });
  }
}

async function updateEvent(req, res) {
  try {
    const eventId = Number(req.params.id);
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ ok: false, message: "Invalid Event ID" });
    }

    const existing = await prisma.event.findUnique({
      where: { EventID: eventId },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const {
      EventName, Description, EventDate, Location,
      ContractAddress, TotalTickets, TicketsSold,
      ImageUrl, ExternalLink,
    } = req.body;

    // Chỉ cập nhật các field được gửi lên (partial update)
    const data = {};
    if (EventName !== undefined)       data.EventName = EventName;
    if (Description !== undefined)     data.Description = Description;
    if (Location !== undefined)        data.Location = Location;
    if (ContractAddress !== undefined) data.ContractAddress = ContractAddress;
    if (ExternalLink !== undefined)    data.ExternalLink = ExternalLink;

    if (EventDate !== undefined) {
      const parsed = EventDate ? new Date(EventDate) : null;
      if (EventDate && Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ ok: false, message: "EventDate must be a valid datetime" });
      }
      data.EventDate = parsed;
    }

    if (TotalTickets !== undefined) {
      const n = Number(TotalTickets);
      if (!Number.isInteger(n) || n <= 0) {
        return res.status(400).json({ ok: false, message: "TotalTickets must be a positive integer" });
      }
      data.TotalTickets = n;
    }

    if (TicketsSold !== undefined) {
      const n = Number(TicketsSold);
      if (!Number.isInteger(n) || n < 0) {
        return res.status(400).json({ ok: false, message: "TicketsSold must be a non-negative integer" });
      }
      data.TicketsSold = n;
    }

    // ─── Auto-fill ảnh từ ExternalLink nếu ImageUrl trống ────────────────────
    if (ImageUrl !== undefined) {
      data.ImageUrl = ImageUrl;
    }

    // Nếu ImageUrl không được gửi (hoặc null) nhưng ExternalLink mới được gửi
    // → tự động cào ảnh
    const effectiveImageUrl = ImageUrl !== undefined ? ImageUrl : existing.ImageUrl;
    const effectiveExternalLink = ExternalLink !== undefined ? ExternalLink : existing.ExternalLink;

    if (!effectiveImageUrl && effectiveExternalLink) {
      console.log(`[eventsController] 🔍 ImageUrl trống, cào ảnh từ: ${effectiveExternalLink}`);
      const scrapedImage = await scrapeImageFromLink(effectiveExternalLink);
      if (scrapedImage) {
        data.ImageUrl = scrapedImage;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ ok: false, message: "No fields to update" });
    }

    const updated = await prisma.event.update({
      where: { EventID: eventId },
      data,
    });

    return res.status(200).json({
      ok: true,
      message: "Event updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to update event",
      error: error.message,
    });
  }
}

async function deleteEvent(req, res) {
  try {
    const eventId = Number(req.params.id);
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ ok: false, message: "Invalid Event ID" });
    }

    const existing = await prisma.event.findUnique({
      where: { EventID: eventId },
      include: { TicketTypes: { include: { Tickets: true } } },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    // Kiểm tra xem đã có vé nào được bán chưa
    const totalTicketsSold = existing.TicketTypes.reduce(
      (sum, tt) => sum + (tt.Tickets?.length || 0), 0
    );

    if (totalTicketsSold > 0 || (existing.TicketsSold && existing.TicketsSold > 0)) {
      return res.status(409).json({
        ok: false,
        message: "Cannot delete event that already has tickets sold. Use cancel instead.",
      });
    }

    // Xóa TicketTypes liên quan trước (cascade thủ công)
    await prisma.ticketType.deleteMany({ where: { EventID: eventId } });
    await prisma.seat.deleteMany({ where: { EventID: eventId } });

    await prisma.event.delete({ where: { EventID: eventId } });

    return res.status(200).json({
      ok: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to delete event",
      error: error.message,
    });
  }
}

async function cancelEvent(req, res) {
  try {
    const eventId = Number(req.params.id);
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ ok: false, message: "Invalid Event ID" });
    }

    const existing = await prisma.event.findUnique({
      where: { EventID: eventId },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    // Đánh dấu sự kiện đã hủy bằng cách set TotalTickets = TicketsSold (không bán thêm)
    // và thêm prefix "[CANCELLED]" vào tên nếu chưa có
    const newName = existing.EventName.startsWith("[CANCELLED]")
      ? existing.EventName
      : `[CANCELLED] ${existing.EventName}`;

    const cancelled = await prisma.event.update({
      where: { EventID: eventId },
      data: { EventName: newName },
    });

    return res.status(200).json({
      ok: true,
      message: "Event cancelled successfully",
      data: cancelled,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to cancel event",
      error: error.message,
    });
  }
}

module.exports = {
  getAllEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  cancelEvent,
};
