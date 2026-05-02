require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Import ABI từ file JSON (paste ABI thật của bạn vào backend/abis/Ticketing.abi.json) ───
const contractABI = require("../abis/Ticketing.abi.json");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SYNC_START_BLOCK = process.env.SYNC_START_BLOCK;
const SYNC_STATE_FILE = path.join(__dirname, "..", "data", "web3-sync-state.json");

// ─── Nhắc nhở cấu hình .env ───
if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0xYourTicketingContractAddress") {
  console.warn(
    "[Web3] ⚠️  CONTRACT_ADDRESS trong file .env đang trống hoặc mang giá trị mặc định.\n" +
    "           Hãy cập nhật CONTRACT_ADDRESS=<địa chỉ contract thật> trong file .env trước khi chạy."
  );
}

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getReadOnlyContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Missing CONTRACT_ADDRESS in environment variables");
  }

  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
}

function getSignerContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Missing CONTRACT_ADDRESS in environment variables");
  }

  if (!PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in environment variables");
  }

  const provider = getProvider();
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
}

function ensureSyncStateDir() {
  const dir = path.dirname(SYNC_STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readSyncState() {
  try {
    if (!fs.existsSync(SYNC_STATE_FILE)) {
      return null;
    }

    const raw = fs.readFileSync(SYNC_STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.warn("[Web3] Could not read sync state file, fallback to default sync start:", error.message);
    return null;
  }
}

function writeSyncState(lastProcessedBlock) {
  try {
    ensureSyncStateDir();
    fs.writeFileSync(
      SYNC_STATE_FILE,
      JSON.stringify(
        {
          contractAddress: CONTRACT_ADDRESS,
          lastProcessedBlock,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (error) {
    console.warn("[Web3] Could not persist sync state:", error.message);
  }
}

function getConfiguredStartBlock() {
  if (!SYNC_START_BLOCK) {
    return null;
  }

  const parsed = Number.parseInt(SYNC_START_BLOCK, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    console.warn("[Web3] SYNC_START_BLOCK is invalid, ignoring value:", SYNC_START_BLOCK);
    return null;
  }

  return parsed;
}

function getFromBlockForSync() {
  const state = readSyncState();

  if (state && state.contractAddress === CONTRACT_ADDRESS && Number.isInteger(state.lastProcessedBlock)) {
    return state.lastProcessedBlock + 1;
  }

  const configured = getConfiguredStartBlock();
  if (configured !== null) {
    return configured;
  }

  return 0;
}

async function persistTicketPurchased(ticketId, eventId, buyer, txHash, io, source) {
  const tokenId = ticketId.toString();

  try {
    const saved = await prisma.ticket.create({
      data: {
        TicketTypeID: Number(eventId),
        OwnerWallet: buyer,
        TokenID: tokenId,
        TransactionHash: txHash,
        IsUsed: false,
      },
    });

    if (io) {
      io.emit("newTicketPurchased", {
        message: "🎉 Một vé mới vừa được phát hành từ Blockchain!",
        ticket: saved,
      });
    }

    console.log(`[Web3] ✅ Saved ticket from ${source}: tokenId=${tokenId}, tx=${txHash ?? "n/a"}`);
  } catch (dbErr) {
    if (dbErr?.code === "P2002") {
      console.log(`[Web3] ℹ️ Ticket already exists (skip): tokenId=${tokenId}`);
      return;
    }

    console.error("[Web3] ❌ Failed to save ticket:", dbErr.message);
  }
}

async function resolveCreatorUserId(organizerWallet) {
  if (!organizerWallet) {
    return null;
  }

  const creator = await prisma.user.findFirst({
    where: {
      WalletAddress: {
        equals: organizerWallet,
        mode: "insensitive",
      },
    },
    select: {
      UserID: true,
    },
  });

  return creator?.UserID ?? null;
}

async function persistEventCreated(contract, eventId, name, price, totalTickets, organizer, txHash, source) {
  const normalizedOrganizer = organizer ? organizer.toLowerCase() : null;
  const eventIdNumber = Number(eventId);
  const eventPriceWei = price?.toString?.() ?? String(price ?? "0");
  const totalTicketsNumber = Number(totalTickets);

  if (!Number.isInteger(eventIdNumber) || eventIdNumber < 0) {
    console.warn(`[Web3] Invalid eventId from ${source}:`, eventId?.toString?.() ?? eventId);
    return;
  }

  if (!Number.isInteger(totalTicketsNumber) || totalTicketsNumber <= 0) {
    console.warn(`[Web3] Invalid totalTickets from ${source}:`, totalTickets?.toString?.() ?? totalTickets);
    return;
  }

  try {
    const onChainEvent = await contract.events(eventId);
    const startTime = Number(onChainEvent.startTime);
    const sold = Number(onChainEvent.sold);
    const cancelled = Boolean(onChainEvent.cancelled);
    const createdByUserId = await resolveCreatorUserId(normalizedOrganizer);

    await prisma.event.upsert({
      where: {
        EventID: eventIdNumber,
      },
      update: {
        EventName: name,
        Price: eventPriceWei,
        EventDate: Number.isFinite(startTime) && startTime > 0 ? new Date(startTime * 1000) : null,
        ContractAddress: CONTRACT_ADDRESS,
        TotalTickets: totalTicketsNumber,
        TicketsSold: Number.isFinite(sold) && sold >= 0 ? sold : 0,
        IsCancelled: cancelled,
        CreatedBy: createdByUserId,
      },
      create: {
        EventID: eventIdNumber,
        EventName: name,
        Price: eventPriceWei,
        EventDate: Number.isFinite(startTime) && startTime > 0 ? new Date(startTime * 1000) : null,
        ContractAddress: CONTRACT_ADDRESS,
        TotalTickets: totalTicketsNumber,
        TicketsSold: Number.isFinite(sold) && sold >= 0 ? sold : 0,
        IsCancelled: cancelled,
        CreatedBy: createdByUserId,
      },
    });

    console.log(`[Web3] ✅ Synced EventCreated from ${source}: eventId=${eventIdNumber}, tx=${txHash ?? "n/a"}`);
  } catch (dbErr) {
    console.error("[Web3] ❌ Failed to sync EventCreated:", dbErr.message);
  }
}

/**
 * Queries logs in chunks to handle RPC block range limits (e.g., Sapphire max 100 blocks)
 * @param {*} contract - ethers.Contract instance
 * @param {*} filter - Event filter from contract.filters.*()
 * @param {number} fromBlock - Start block
 * @param {number} toBlock - End block
 * @param {number} maxBlocksPerQuery - Max blocks per single query (default 100 for Sapphire)
 * @returns {Array} Combined events from all chunks
 */
async function queryFilterInChunks(contract, filter, fromBlock, toBlock, maxBlocksPerQuery = 100) {
  const allEvents = [];
  let currentFrom = fromBlock;

  while (currentFrom <= toBlock) {
    const currentTo = Math.min(currentFrom + maxBlocksPerQuery - 1, toBlock);
    try {
      const events = await contract.queryFilter(filter, currentFrom, currentTo);
      allEvents.push(...events);
      console.log(`[Web3] Queried blocks ${currentFrom}-${currentTo}, found ${events.length} events`);
    } catch (err) {
      console.error(`[Web3] Error querying blocks ${currentFrom}-${currentTo}:`, err.message);
      // Continue with next chunk instead of failing completely
    }
    currentFrom = currentTo + 1;
  }

  return allEvents;
}

async function syncHistoricalEventCreated(contract, fromBlock, latestBlock) {
  console.log(`[Web3] Historical sync EventCreated from block ${fromBlock} to ${latestBlock} (chunked, max 100 blocks/query)`);
  const events = await queryFilterInChunks(contract, contract.filters.EventCreated(), fromBlock, latestBlock);

  for (const ev of events) {
    const [eventId, name, price, totalTickets, organizer] = ev.args ?? [];
    if (eventId === undefined || !name || price === undefined || totalTickets === undefined || !organizer) {
      continue;
    }

    await persistEventCreated(
      contract,
      eventId,
      name,
      price,
      totalTickets,
      organizer,
      ev.transactionHash ?? null,
      "history"
    );
  }

  return events.length;
}

async function syncHistoricalTicketPurchased(contract, io, fromBlock, latestBlock) {
  console.log(`[Web3] Historical sync TicketPurchased from block ${fromBlock} to ${latestBlock} (chunked, max 100 blocks/query)`);
  const events = await queryFilterInChunks(contract, contract.filters.TicketPurchased(), fromBlock, latestBlock);

  for (const ev of events) {
    const [ticketId, eventId, buyer] = ev.args ?? [];
    if (ticketId === undefined || eventId === undefined || buyer === undefined) {
      continue;
    }

    await persistTicketPurchased(ticketId, eventId, buyer, ev.transactionHash ?? null, io, "history");
  }

  return events.length;
}

async function syncHistoricalEvents(contract, io) {
  const latestBlock = await contract.runner.provider.getBlockNumber();
  const fromBlock = getFromBlockForSync();

  if (fromBlock > latestBlock) {
    writeSyncState(latestBlock);
    console.log(`[Web3] Historical sync skipped: fromBlock=${fromBlock} > latest=${latestBlock}`);
    return;
  }

  const createdCount = await syncHistoricalEventCreated(contract, fromBlock, latestBlock);
  const purchasedCount = await syncHistoricalTicketPurchased(contract, io, fromBlock, latestBlock);

  writeSyncState(latestBlock);
  console.log(`[Web3] Historical sync completed. EventCreated=${createdCount}, TicketPurchased=${purchasedCount}.`);
}

/**
 * listenToBlockchain(io)
 * Kết nối RPC, lắng nghe event TicketPurchased từ Smart Contract thật.
 * ABI được load từ backend/abis/TicketContract.json.
 * Mỗi khi event được phát ra → gọi createTicket() lưu vào DB
 *                             → emit Socket.io 'newTicketPurchased'.
 */
async function listenToBlockchain(io) {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0xYourTicketingContractAddress") {
    console.warn(
      "[Web3] CONTRACT_ADDRESS chưa được cấu hình → bỏ qua listenToBlockchain()"
    );
    return;
  }

  try {
    const provider = getProvider();

    // Sử dụng ABI import từ backend/abis/TicketContract.json
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

    await syncHistoricalEvents(contract, io);

    console.log(`[Web3] Listening realtime EventCreated + TicketPurchased on contract: ${CONTRACT_ADDRESS}`);

    contract.on("EventCreated", async (eventId, name, price, totalTickets, organizer, event) => {
      const txHash = event?.log?.transactionHash ?? event?.transactionHash ?? null;

      await persistEventCreated(
        contract,
        eventId,
        name,
        price,
        totalTickets,
        organizer,
        txHash,
        "realtime"
      );

      const blockNumber = event?.log?.blockNumber;
      if (Number.isInteger(blockNumber)) {
        writeSyncState(blockNumber);
      }
    });

    // Event signature trong Ticketing.sol:
    // event TicketPurchased(uint256 indexed ticketId, uint256 indexed eventId, address indexed buyer)
    contract.on("TicketPurchased", async (ticketId, eventId, buyer, event) => {
      const txHash = event?.log?.transactionHash ?? event?.transactionHash ?? null;

      console.log("[Web3] TicketPurchased event nhận được:", {
        ticketId: ticketId.toString(),
        eventId: eventId.toString(),
        buyer,
        txHash,
      });

      await persistTicketPurchased(ticketId, eventId, buyer, txHash, io, "realtime");

      const blockNumber = event?.log?.blockNumber;
      if (Number.isInteger(blockNumber)) {
        writeSyncState(blockNumber);
      }
    });

    // Xử lý lỗi kết nối provider
    provider.on("error", (err) => {
      console.error("[Web3] Lỗi provider:", err.message);
    });
  } catch (err) {
    console.error("[Web3] Lỗi khởi động listenToBlockchain():", err.message);
  }
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * simulateBlockchainEvent() — ĐÃ COMMENT LẠI (không dùng mock data nữa)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * function simulateBlockchainEvent() {
 *   console.log("[Web3-Sim] ⏳ Sẽ giả lập event TicketMinted sau 5 giây...");
 *
 *   setTimeout(async () => {
 *     const hexChars = "0123456789abcdef";
 *     const randomHex = (len) =>
 *       "0x" +
 *       Array.from({ length: len }, () =>
 *         hexChars[Math.floor(Math.random() * hexChars.length)]
 *       ).join("");
 *
 *     const mockOwner = randomHex(40);
 *     const mockTicketTypeId = 1;
 *     const mockTokenId = String(Math.floor(Math.random() * 1_000_000) + 1);
 *     const mockTxHash = randomHex(64);
 *
 *     try {
 *       const saved = await createTicket({
 *         TicketTypeID: mockTicketTypeId,
 *         OwnerWallet: mockOwner,
 *         TokenID: mockTokenId,
 *         TransactionHash: mockTxHash,
 *         IsUsed: false,
 *       });
 *       console.log("[Web3-Sim] ✅ Ticket mock đã lưu vào DB thành công:", saved);
 *     } catch (dbErr) {
 *       console.error("[Web3-Sim] ❌ Lỗi khi lưu ticket mock vào DB:", dbErr.message);
 *     }
 *   }, 5000);
 * }
 */

module.exports = {
  listenToBlockchain,
  // Các helper sau vẫn được export để route /web3/info trong server.js sử dụng
  getProvider,
  getReadOnlyContract,
  getSignerContract,
};
