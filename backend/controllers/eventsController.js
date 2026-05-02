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

    const createdEvent = await prisma.event.create({
      data: {
        EventName,
        MetaURL: resolvedMetaURL,
        ImageURL: resolvedImageCid,
        Price: resolvedPriceWei,
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

module.exports = {
  getAllEvents,
  createEvent,
  getEventById,
};
