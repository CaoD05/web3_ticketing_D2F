require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Import ABI ───
const contractABI = require("../abis/Ticketing.abi.json");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SYNC_START_BLOCK = process.env.SYNC_START_BLOCK;
const SYNC_STATE_FILE = path.join(__dirname, "..", "data", "web3-sync-state.json");

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getReadOnlyContract() {
  if (!CONTRACT_ADDRESS) throw new Error("Missing CONTRACT_ADDRESS");
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI, getProvider());
}

function getSignerContract() {
  if (!CONTRACT_ADDRESS || !PRIVATE_KEY) throw new Error("Missing CONTRACT_ADDRESS or PRIVATE_KEY");
  const wallet = new ethers.Wallet(PRIVATE_KEY, getProvider());
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
}

function writeSyncState(lastProcessedBlock) {
  try {
    const dir = path.dirname(SYNC_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify({ contractAddress: CONTRACT_ADDRESS, lastProcessedBlock, updatedAt: new Date().toISOString() }, null, 2));
  } catch (error) { console.warn("[Web3] Persistence error:", error.message); }
}

function getFromBlockForSync() {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(SYNC_STATE_FILE, "utf8"));
      if (state.contractAddress === CONTRACT_ADDRESS) return state.lastProcessedBlock + 1;
    }
  } catch (e) {}
  return SYNC_START_BLOCK ? parseInt(SYNC_START_BLOCK, 10) : 0;
}

async function resolveCreatorUserId(wallet) {
  if (!wallet) return null;
  const user = await prisma.user.findFirst({ where: { WalletAddress: { equals: wallet, mode: "insensitive" } }, select: { UserID: true } });
  return user?.UserID ?? null;
}

// ─── Import Helpers ───
const { buildMetaUrlCandidates, normalizeImageCid } = require("../utils/metadataHelper");

async function persistEventCreated(contract, eventId, name, price, totalTickets, organizer, metaURL, txHash) {
  try {
    const eventIdNum = Number(eventId);
    const userId = await resolveCreatorUserId(organizer);

    // Fetch full on-chain event details to get the startTime
    let onChainDate = null;
    try {
      const evData = await contract.events(eventIdNum);
      if (evData && evData.startTime) {
        onChainDate = new Date(Number(evData.startTime) * 1000);
      }
    } catch (contractErr) {
      console.warn(`[Web3] Could not fetch on-chain date for event ${eventIdNum}:`, contractErr.message);
    }

    // NEW: Fetch IPFS Metadata to hydrate missing fields (Location, Category, Images)
    let ipfsDetails = { location: null, category: null, banner: null, detail: null };
    if (metaURL) {
      const candidates = buildMetaUrlCandidates(metaURL);
      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const json = await response.json();
            ipfsDetails = {
              location: json.location || null,
              category: json.category || null,
              banner: normalizeImageCid(json.banner_image || json.image),
              detail: normalizeImageCid(json.detail_image || json.image || json.banner_image)
            };
            break; 
          }
        } catch (e) {}
      }
    }

    // 1. Check if we already have this on-chain event linked
    const alreadyExists = await prisma.event.findUnique({
      where: { ContractEventID: eventIdNum }
    });

    if (alreadyExists) {
      console.log(`[Web3] Event ${eventIdNum} already exists. Updating.`);
      await prisma.event.update({
        where: { EventID: alreadyExists.EventID },
        data: { 
          EventName: name, 
          Price: price.toString(), 
          TotalTickets: Number(totalTickets),
          EventDate: onChainDate || alreadyExists.EventDate,
          Location: ipfsDetails.location || alreadyExists.Location,
          EventType: ipfsDetails.category || alreadyExists.EventType,
          BannerURL: ipfsDetails.banner || alreadyExists.BannerURL,
          DetailURL: ipfsDetails.detail || alreadyExists.DetailURL,
          ContractAddress: process.env.CONTRACT_ADDRESS || alreadyExists.ContractAddress,
          // Sync the single ticket type
          TicketTypes: {
            updateMany: {
              where: { TypeName: "Standard" },
              data: { Price: price.toString(), Quantity: Number(totalTickets) }
            }
          }
        }
      });
      return;
    }

    // 2. Try to find a "draft" event (created by API but not linked yet)
    let existingEvent = await prisma.event.findFirst({
      where: {
        AND: [
          { ContractEventID: null },
          { OR: [
              { MetaURL: metaURL },
              { AND: [{ EventName: name }, { CreatedBy: userId }] }
            ] 
          }
        ]
      },
      include: { TicketTypes: true }
    });

    if (existingEvent) {
      await prisma.event.update({
        where: { EventID: existingEvent.EventID },
        data: { 
          ContractEventID: eventIdNum, 
          Price: price.toString(), 
          TotalTickets: Number(totalTickets),
          EventDate: onChainDate || existingEvent.EventDate,
          Location: ipfsDetails.location || existingEvent.Location,
          EventType: ipfsDetails.category || existingEvent.EventType,
          BannerURL: ipfsDetails.banner || existingEvent.BannerURL,
          DetailURL: ipfsDetails.detail || existingEvent.DetailURL,
          ContractAddress: CONTRACT_ADDRESS,
          // Ensure at least one Standard type exists and matches
          TicketTypes: existingEvent.TicketTypes.length > 0 
            ? {
                updateMany: {
                  where: { TicketTypeID: existingEvent.TicketTypes[0].TicketTypeID },
                  data: { TypeName: "Standard", Price: price.toString(), Quantity: Number(totalTickets) }
                }
              }
            : {
                create: { TypeName: "Standard", Price: price.toString(), Quantity: Number(totalTickets) }
              }
        }
      });
      console.log(`[Web3] Linked on-chain event ${eventIdNum} to DB record ${existingEvent.EventID}`);
    } else {
      // 3. Create fresh record (Using relation syntax to be safer)
      const data = { 
        ContractEventID: eventIdNum, 
        EventName: name, 
        Price: price.toString(), 
        TotalTickets: Number(totalTickets), 
        MetaURL: metaURL,
        EventDate: onChainDate,
        Location: ipfsDetails.location,
        EventType: ipfsDetails.category,
        BannerURL: ipfsDetails.banner,
        DetailURL: ipfsDetails.detail,
        ContractAddress: CONTRACT_ADDRESS,
        TicketTypes: {
          create: {
            TypeName: "Standard",
            Price: price.toString(),
            Quantity: Number(totalTickets)
          }
        }
      };

      if (userId) {
        data.Creator = { connect: { UserID: userId } };
      }

      const newEvent = await prisma.event.create({ data });
      console.log(`[Web3] Created new event with single Standard type. DB ID: ${newEvent.EventID}`);
    }
  } catch (e) { 
    console.error("[Web3] EventCreated sync error:", e.message); 
  }
}


async function persistTicketPurchased(ticketId, eventId, buyer, txHash) {
  try {
    const ticketIdStr = ticketId.toString();
    const eventIdNum = Number(eventId);
    
    // 1. Find the Event in DB
    const event = await prisma.event.findUnique({
      where: { ContractEventID: eventIdNum },
      include: { TicketTypes: true }
    });

    if (!event) {
      console.warn(`[Web3] Received ticket for unknown on-chain event ${eventIdNum}. Skipping.`);
      return;
    }

    // 2. Resolve TicketType (Strictly use the first/only type)
    let ticketType = event.TicketTypes[0];
    if (!ticketType) {
      // Create it if it somehow doesn't exist
      ticketType = await prisma.ticketType.create({
        data: {
          EventID: event.EventID,
          TypeName: "Standard",
          Price: event.Price || 0,
          Quantity: event.TotalTickets
        }
      });
    }

    // 3. Find User by Wallet
    const user = await prisma.user.findFirst({
      where: { WalletAddress: { equals: buyer, mode: "insensitive" } }
    });

    // 4. Handle Order (Idempotency)
    let order = await prisma.order.findFirst({
      where: { TxHash: txHash }
    });

    if (!order) {
      order = await prisma.order.create({
        data: {
          UserID: user?.UserID || null,
          TicketTypeID: ticketType.TicketTypeID, 
          Status: "confirmed",
          TxHash: txHash,
          TotalAmount: ticketType.Price || 0
        }
      });
    } else {
      if (order.Status !== "confirmed") {
        await prisma.order.update({
          where: { OrderID: order.OrderID },
          data: { Status: "confirmed", TicketTypeID: ticketType.TicketTypeID }
        });
      }
    }

    // 5. Upsert Ticket
    await prisma.ticket.upsert({
      where: { TokenID: ticketIdStr },
      update: { 
        OwnerWallet: buyer, 
        TransactionHash: txHash,
        OrderID: order.OrderID,
        TicketTypeID: ticketType.TicketTypeID
      },
      create: { 
        TokenID: ticketIdStr,
        TicketTypeID: ticketType.TicketTypeID, 
        OwnerWallet: buyer, 
        TransactionHash: txHash,
        OrderID: order.OrderID,
        IsUsed: false
      }
    });

    // 6. Update Event tickets sold
    await prisma.event.update({
      where: { EventID: event.EventID },
      data: { TicketsSold: { increment: 1 } }
    });

    console.log(`[Web3] Ticket ${ticketIdStr} processed. Linked to Order ${order.OrderID}`);
  } catch (e) { console.error("[Web3] TicketPurchased error:", e.message); }
}

async function persistTicketUsed(ticketId) {
  try {
    await prisma.ticket.update({
      where: { TokenID: ticketId.toString() },
      data: { IsUsed: true }
    });
    console.log(`[Web3] Ticket ${ticketId} marked as used.`);
  } catch (e) { console.error("[Web3] TicketUsed error:", e.message); }
}

async function persistTicketTransferred(ticketId, from, to) {
  try {
    await prisma.ticket.update({
      where: { TokenID: ticketId.toString() },
      data: { OwnerWallet: to, QRCode: null } // Clear resale price/QR if stored there
    });
    console.log(`[Web3] Ticket ${ticketId} transferred ${from} -> ${to}.`);
  } catch (e) { console.error("[Web3] TicketTransferred error:", e.message); }
}

async function persistResaleListed(ticketId, price) {
  try {
    await prisma.ticket.update({
      where: { TokenID: ticketId.toString() },
      data: { QRCode: price.toString() } // Using QRCode field as a temporary storage for resale price in this schema
    });
    console.log(`[Web3] Ticket ${ticketId} listed for ${price}.`);
  } catch (e) { console.error("[Web3] ResaleListed error:", e.message); }
}

async function persistResaleSold(ticketId, from, to, price) {
  try {
    await prisma.ticket.update({
      where: { TokenID: ticketId.toString() },
      data: { OwnerWallet: to, QRCode: null }
    });
    console.log(`[Web3] Ticket ${ticketId} resale sold to ${to}.`);
  } catch (e) { console.error("[Web3] ResaleSold error:", e.message); }
}

async function persistEventCancelled(eventId) {
  try {
    const eventIdNum = Number(eventId);
    const event = await prisma.event.findUnique({
      where: { ContractEventID: eventIdNum }
    });

    if (!event) {
      console.warn(`[Web3] Received cancellation for unknown on-chain event ${eventIdNum}`);
      return;
    }

    if (!event.IsCancelled) {
      const newName = event.EventName.startsWith("[CANCELLED]") ? event.EventName : `[CANCELLED] ${event.EventName}`;
      await prisma.event.update({
        where: { EventID: event.EventID },
        data: { IsCancelled: true, EventName: newName }
      });
      console.log(`[Web3] Event ${eventIdNum} (DB ID: ${event.EventID}) marked as cancelled.`);
    }
  } catch (e) { console.error("[Web3] EventCancelled error:", e.message); }
}

async function syncHistorical(contract) {
  const latest = await getProvider().getBlockNumber();
  const from = getFromBlockForSync();
  if (from > latest) return;

  console.log(`[Web3] Syncing from ${from} to ${latest}...`);
  
  const step = 100;
  for (let i = from; i <= latest; i += step) {
    const to = Math.min(i + step - 1, latest);
    
    const events = [
      { filter: contract.filters.EventCreated(), handler: async (args, tx) => persistEventCreated(contract, ...args, tx) },
      { filter: contract.filters.EventCancelled(), handler: async (args) => persistEventCancelled(...args) },
      { filter: contract.filters.TicketPurchased(), handler: async (args, tx) => persistTicketPurchased(...args, tx) },
      { filter: contract.filters.TicketUsed(), handler: async (args) => persistTicketUsed(...args) },
      { filter: contract.filters.TicketTransferred(), handler: async (args) => persistTicketTransferred(...args) },
      { filter: contract.filters.ResaleListed(), handler: async (args) => persistResaleListed(...args) },
      { filter: contract.filters.ResaleSold(), handler: async (args) => persistResaleSold(...args) }
    ];

    for (const item of events) {
      const logs = await contract.queryFilter(item.filter, i, to);
      for (const log of logs) {
        await item.handler(log.args, log.transactionHash);
      }
    }
    writeSyncState(to);
  }
}

async function listenToBlockchain(io) {
  if (!CONTRACT_ADDRESS) return;
  const contract = getReadOnlyContract();
  
  await syncHistorical(contract);

  console.log("[Web3] Listening for events...");

  contract.on("EventCreated", (eventId, name, price, totalTickets, organizer, metaURL, event) => {
    persistEventCreated(contract, eventId, name, price, totalTickets, organizer, metaURL, event.log.transactionHash);
    writeSyncState(event.log.blockNumber);
  });

  contract.on("EventCancelled", (eventId, event) => {
    persistEventCancelled(eventId);
    writeSyncState(event.log.blockNumber);
  });

  contract.on("TicketPurchased", (ticketId, eventId, buyer, event) => {
    persistTicketPurchased(ticketId, eventId, buyer, event.log.transactionHash);
    if (io) io.emit("newTicket", { ticketId: ticketId.toString(), buyer });
    writeSyncState(event.log.blockNumber);
  });

  contract.on("TicketUsed", (ticketId, event) => {
    persistTicketUsed(ticketId);
    writeSyncState(event.log.blockNumber);
  });

  contract.on("TicketTransferred", (ticketId, from, to, event) => {
    persistTicketTransferred(ticketId, from, to);
    writeSyncState(event.log.blockNumber);
  });

  contract.on("ResaleListed", (ticketId, price, event) => {
    persistResaleListed(ticketId, price);
    writeSyncState(event.log.blockNumber);
  });

  contract.on("ResaleSold", (ticketId, from, to, price, event) => {
    persistResaleSold(ticketId, from, to, price);
    writeSyncState(event.log.blockNumber);
  });
}

module.exports = { listenToBlockchain, getProvider, getReadOnlyContract, getSignerContract };
