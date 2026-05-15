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

// ─── Event Handlers ───

async function persistEventCreated(contract, eventId, name, price, totalTickets, organizer, metaURL, txHash) {
  try {
    const eventIdNum = Number(eventId);
    const userId = await resolveCreatorUserId(organizer);
    
    // Fetch more details from contract if needed
    const onChain = await contract.events(eventId);

    await prisma.event.upsert({
      where: { EventID: eventIdNum },
      update: { EventName: name, Price: price.toString(), TotalTickets: Number(totalTickets), MetaURL: metaURL, CreatedBy: userId, IsCancelled: onChain.cancelled },
      create: { EventID: eventIdNum, EventName: name, Price: price.toString(), TotalTickets: Number(totalTickets), MetaURL: metaURL, CreatedBy: userId }
    });
    console.log(`[Web3] Event ${eventIdNum} synced.`);
  } catch (e) { console.error("[Web3] EventCreated error:", e.message); }
}

async function persistTicketPurchased(ticketId, eventId, buyer, txHash) {
  try {
    await prisma.ticket.upsert({
      where: { TokenID: ticketId.toString() },
      update: { OwnerWallet: buyer, TransactionHash: txHash },
      create: { TicketTypeID: Number(eventId), OwnerWallet: buyer, TokenID: ticketId.toString(), TransactionHash: txHash }
    });
    console.log(`[Web3] Ticket ${ticketId} purchased by ${buyer}.`);
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
