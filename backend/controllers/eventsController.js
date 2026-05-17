const prisma = require("../utils/prismaClient");
const { ethers } = require("ethers");
const { getReadOnlyContract } = require("../services/web3");
const { uploadFileToIPFS, uploadJSONToIPFS } = require("../utils/pinata");
const { 
  scrapeImageFromLink, 
  buildMetaUrlCandidates, 
  normalizeImageCid,
  toWeiString,
  mapPriceFields
} = require("../utils/metadataHelper");

const metaImageCache = new Map();

async function fetchImageCidsFromMeta(metaURL) {
  if (!metaURL) {
    return { bannerCid: null, detailCid: null };
  }

  // Simple cache for results (could be improved)
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
      const bannerCid = normalizeImageCid(metaJson?.image || metaJson?.banner_image);
      const detailCid = normalizeImageCid(metaJson?.image_detail || metaJson?.detail_image || bannerCid);

      if (bannerCid || detailCid) {
        const result = { bannerCid, detailCid };
        metaImageCache.set(metaURL, result);
        return result;
      }
    } catch {
      // Try next gateway candidate.
    }
  }

  const result = { bannerCid: null, detailCid: null };
  metaImageCache.set(metaURL, result);
  return result;
}

async function hydrateEventImages(event) {
  const storedBannerCid = normalizeImageCid(event.BannerURL);
  const storedDetailCid = normalizeImageCid(event.DetailURL);

  if (storedBannerCid && storedDetailCid) {
    return event;
  }

  if (!event.MetaURL) {
    return {
      ...event,
      BannerURL: storedBannerCid || null,
      DetailURL: storedDetailCid || null,
    };
  }

  const { bannerCid, detailCid } = await fetchImageCidsFromMeta(event.MetaURL);
  
  const finalBanner = storedBannerCid || bannerCid;
  const finalDetail = storedDetailCid || detailCid;

  if (finalBanner !== event.BannerURL || finalDetail !== event.DetailURL) {
    try {
      await prisma.event.update({
        where: { EventID: event.EventID },
        data: {
          BannerURL: finalBanner,
          DetailURL: finalDetail,
        },
      });
    } catch (err) {
      console.error("Failed to update hydrated images:", err.message);
    }
  }

  return {
    ...event,
    BannerURL: finalBanner,
    DetailURL: finalDetail,
  };
}

async function attachOnChainPrice(contract, event) {
  try {
    if (contract && event.ContractEventID != null) {
      const onChainEvent = await contract.events(event.ContractEventID);
      const onChainPriceWei = toWeiString(onChainEvent?.price);
      if (onChainPriceWei) {
        return mapPriceFields(event, onChainPriceWei);
      }
    }
  } catch (error) {
    console.warn(`[eventsController] RPC call failed for ContractEventID ${event.ContractEventID}:`, error.message);
  }

  return mapPriceFields(event, toWeiString(event.Price));
}

async function getAllEvents(req, res) {
  try {
    let contract = null;
    try {
      contract = getReadOnlyContract();
    } catch {
      contract = null;
    }

    let where = {};

    // 1. If Admin -> See everything
    if (req.user && req.user.role === 'admin') {
      where = {}; 
    } 
    // 2. If Organizer -> See all public + their OWN private/cancelled ones
    else if (req.user && req.user.role === 'organizer') {
      where = {
        OR: [
          { AND: [{ IsHidden: false }, { IsCancelled: false }] },
          { CreatedBy: req.user.userId }
        ]
      };
    } 
    // 3. If Public/User -> See only public and active
    else {
      where = {
        IsHidden: false,
        IsCancelled: false,
      };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: [
        { CreatedAt: 'desc' },
        { EventID: 'desc' }
      ]
    });

    const now = new Date();
    const formattedEvents = await Promise.all(
      events.map(async (event) => {
        let status = (event.EventDate && new Date(event.EventDate) > now) ? 'Active' : 'Ended';
        if (event.IsCancelled) {
          status = 'Cancelled';
        }

        const baseEvent = {
          ...event,
          Status: status
        };

        const withPrice = await attachOnChainPrice(contract, baseEvent);
        return hydrateEventImages(withPrice);
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
      BannerURL,
      bannerURL,
      DetailURL,
      detailURL,
      EventDate = null,
      Location = null,
      EventType = null,
      ContractAddress = null,
      TotalTickets, TicketsSold = 0, CreatedBy = null,
      ExternalLink = null,
    } = req.body;

    const resolvedMetaURL = MetaURL ?? metaURL ?? Description ?? null;
    const resolvedPriceWei = toWeiString(priceWei ?? Price);
    
    let finalBanner = normalizeImageCid(BannerURL ?? bannerURL);
    let finalDetail = normalizeImageCid(DetailURL ?? detailURL);

    if (!finalBanner || !finalDetail) {
      const { bannerCid, detailCid } = await fetchImageCidsFromMeta(resolvedMetaURL);
      if (!finalBanner) finalBanner = bannerCid;
      if (!finalDetail) finalDetail = detailCid;
    }

    if (!EventName || TotalTickets == null) {
      return res.status(400).json({ ok: false, message: "EventName and TotalTickets are required" });
    }

    const parsedTotalTickets = Number(TotalTickets);
    const parsedTicketsSold = Number(TicketsSold);
    const parsedEventDate = EventDate ? new Date(EventDate) : null;
    const parsedCreatedBy = CreatedBy == null ? null : Number(CreatedBy);

    if (!finalBanner && ExternalLink) {
      const scraped = await scrapeImageFromLink(ExternalLink);
      if (scraped) finalBanner = normalizeImageCid(scraped);
    }

    const createdEvent = await prisma.event.create({
      data: {
        EventName,
        MetaURL: resolvedMetaURL,
        BannerURL: finalBanner,
        DetailURL: finalDetail || finalBanner,
        Price: resolvedPriceWei,
        EventDate: parsedEventDate,
        Location,
        EventType,
        ExternalLink: ExternalLink || null,
        ContractAddress,
        TotalTickets: parsedTotalTickets,
        TicketsSold: parsedTicketsSold,
        Creator: parsedCreatedBy ? { connect: { UserID: parsedCreatedBy } } : undefined,
        TicketTypes: {
          create: {
            TypeName: "Vé tiêu chuẩn",
            Price: resolvedPriceWei ? Number(ethers.formatEther(resolvedPriceWei)) : 0,
            Quantity: parsedTotalTickets,
          }
        }
      },
      include: {
        TicketTypes: true
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
      where: { EventID: Number(eventId) },
      include: { TicketTypes: true }
    });
    
    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const now = new Date();
    let status = (event.EventDate && new Date(event.EventDate) > now) ? 'Active' : 'Ended';
    if (event.IsCancelled) {
      status = 'Cancelled';
    }

    const eventWithStatus = {
      ...event,
      Status: status
    };

    const enrichedEvent = await attachOnChainPrice(contract, eventWithStatus);
    const enrichedEventWithImages = await hydrateEventImages(enrichedEvent);

    return res.status(200).json({
      ok: true,
      data: enrichedEventWithImages,
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
    const existing = await prisma.event.findUnique({ where: { EventID: eventId } });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    if (req.user.role !== 'admin' && existing.CreatedBy !== req.user.userId) {
      return res.status(403).json({ ok: false, message: "Bạn không có quyền chỉnh sửa sự kiện này" });
    }

    // Capture all possible fields
    const {
      EventName, Description, EventDate, Location,
      ContractAddress, TotalTickets, TicketsSold,
      BannerURL, DetailURL, ExternalLink,
      IsHidden, IsFeatured
    } = req.body;

    const data = {};
    if (EventName !== undefined)       data.EventName = EventName;
    if (Description !== undefined)     data.Description = Description;
    if (Location !== undefined)        data.Location = Location;
    if (ContractAddress !== undefined) data.ContractAddress = ContractAddress;
    if (ExternalLink !== undefined)    data.ExternalLink = ExternalLink;
    
    // Safety check for booleans
    if (IsHidden !== undefined)        data.IsHidden = !!IsHidden;
    if (IsFeatured !== undefined)      data.IsFeatured = !!IsFeatured;

    if (EventDate !== undefined)       data.EventDate = EventDate ? new Date(EventDate) : null;
    if (TotalTickets !== undefined)    data.TotalTickets = Number(TotalTickets);
    if (TicketsSold !== undefined)     data.TicketsSold = Number(TicketsSold);
    
    if (BannerURL !== undefined)       data.BannerURL = normalizeImageCid(BannerURL);
    if (DetailURL !== undefined)       data.DetailURL = normalizeImageCid(DetailURL);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ ok: false, message: "No valid fields to update" });
    }

    const updated = await prisma.event.update({
      where: { EventID: eventId },
      data,
    });

    if (req.user.role === 'admin') {
      await prisma.systemAuditLog.create({
        data: {
          AdminID: req.user.userId,
          Action: "UPDATE_EVENT",
          TargetType: "Event",
          TargetID: String(eventId),
          Details: JSON.stringify(data)
        }
      }).catch(e => console.warn("Audit log failed:", e.message));
    }

    return res.status(200).json({
      ok: true,
      message: "Event updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("[eventsController] Update Error:", error.message);
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
    const existing = await prisma.event.findUnique({
      where: { EventID: eventId },
      include: { TicketTypes: { include: { Tickets: true } } },
    });

    if (!existing) return res.status(404).json({ ok: false, message: "Event not found" });

    const totalSold = existing.TicketTypes.reduce((sum, tt) => sum + (tt.Tickets?.length || 0), 0);
    if (totalSold > 0 || (existing.TicketsSold && existing.TicketsSold > 0)) {
      return res.status(409).json({ ok: false, message: "Cannot delete event with sales. Use cancel instead." });
    }

    await prisma.ticketType.deleteMany({ where: { EventID: eventId } });
    await prisma.seat.deleteMany({ where: { EventID: eventId } });
    await prisma.event.delete({ where: { EventID: eventId } });

    return res.status(200).json({ ok: true, message: "Event deleted successfully" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to delete event", error: error.message });
  }
}

async function cancelEvent(req, res) {
  try {
    const eventId = Number(req.params.id);
    const existing = await prisma.event.findUnique({ where: { EventID: eventId } });

    if (!existing) return res.status(404).json({ ok: false, message: "Event not found" });

    // Ownership check
    if (req.user.role !== 'admin' && existing.CreatedBy !== req.user.userId) {
      return res.status(403).json({ ok: false, message: "Bạn không có quyền hủy sự kiện này" });
    }

    const newName = existing.EventName.startsWith("[CANCELLED]") ? existing.EventName : `[CANCELLED] ${existing.EventName}`;
    const cancelled = await prisma.event.update({
      where: { EventID: eventId },
      data: { EventName: newName, IsCancelled: true },
    });

    return res.status(200).json({ ok: true, message: "Event cancelled successfully", data: cancelled });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to cancel event", error: error.message });
  }
}

async function createEventMetadata(req, res) {
  try {
    const { name, description, location, date, category } = req.body;
    const bannerFile = req.files?.banner?.[0];
    const detailFile = req.files?.detail?.[0];

    if (!bannerFile) return res.status(400).json({ ok: false, message: "Banner image required" });

    const bannerCid = await uploadFileToIPFS(bannerFile.buffer, bannerFile.originalname, bannerFile.mimetype);
    let detailCid = detailFile ? await uploadFileToIPFS(detailFile.buffer, detailFile.originalname, detailFile.mimetype) : bannerCid;

    const metadata = {
      name, description,
      image: `ipfs://${detailCid}`,
      banner_image: `ipfs://${bannerCid}`,
      detail_image: `ipfs://${detailCid}`,
      location, date, category,
      attributes: [
        { trait_type: "Location", value: location },
        { trait_type: "Date", value: date },
        { trait_type: "Category", value: category }
      ]
    };

    const metadataCid = await uploadJSONToIPFS(metadata, `Event_Metadata_${Date.now()}`);

    return res.status(201).json({
      ok: true,
      message: "Metadata created successfully",
      data: { metadataCid, bannerCid, detailCid, metadata },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to create metadata", error: error.message });
  }
}

module.exports = {
  getAllEvents, createEvent, getEventById, updateEvent, deleteEvent, cancelEvent, createEventMetadata,
};
