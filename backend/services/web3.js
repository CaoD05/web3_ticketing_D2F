require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { createTicket } = require("../models/ticketModel");
const {
  createOnChainEventIfNotExists,
  markOnChainEventCancelled,
} = require("../models/eventModel");

// ─── Import ABI từ file JSON (paste ABI thật của bạn vào backend/abis/TicketContract.json) ───
const contractABI = require("../abis/TicketContract.json");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CONTRACT_START_BLOCK = process.env.CONTRACT_START_BLOCK
  ? Number(process.env.CONTRACT_START_BLOCK)
  : 0;
const SYNC_STATE_FILE = path.join(__dirname, "../.sync-state.json");

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

function getSyncState() {
  try {
    if (!fs.existsSync(SYNC_STATE_FILE)) {
      return {
        lastProcessedEventCreatedBlock: null,
        lastProcessedEventCancelledBlock: null,
      };
    }

    const raw = fs.readFileSync(SYNC_STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      lastProcessedEventCreatedBlock:
        parsed.lastProcessedEventCreatedBlock == null
          ? null
          : Number(parsed.lastProcessedEventCreatedBlock),
      lastProcessedEventCancelledBlock:
        parsed.lastProcessedEventCancelledBlock == null
          ? null
          : Number(parsed.lastProcessedEventCancelledBlock),
    };
  } catch (err) {
    console.warn("[Web3] Cannot read sync state file, fallback to fresh sync:", err.message);
    return {
      lastProcessedEventCreatedBlock: null,
      lastProcessedEventCancelledBlock: null,
    };
  }
}

function setSyncState(nextState) {
  const current = getSyncState();
  const merged = {
    ...current,
    ...nextState,
  };

  try {
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(merged, null, 2), "utf8");
  } catch (err) {
    console.warn("[Web3] Cannot write sync state file:", err.message);
  }
}

async function persistEventCreatedLog(eventId, name, price, totalTickets, organizer) {
  const saved = await createOnChainEventIfNotExists({
    chainEventId: eventId.toString(),
    eventName: name,
    totalTickets: totalTickets.toString(),
    contractAddress: CONTRACT_ADDRESS,
    organizer,
    priceWei: price.toString(),
  });

  return saved;
}

async function syncHistoricalEventCreated(contract, provider) {
  const latestBlock = await provider.getBlockNumber();
  const state = getSyncState();
  const lastProcessed = state.lastProcessedEventCreatedBlock;

  const fromBlock =
    Number.isInteger(lastProcessed) && lastProcessed >= 0
      ? lastProcessed + 1
      : Math.max(0, CONTRACT_START_BLOCK || 0);

  if (fromBlock > latestBlock) {
    return;
  }

  console.log(`[Web3] Sync EventCreated historical logs from block ${fromBlock} to ${latestBlock}`);
  const logs = await contract.queryFilter(contract.filters.EventCreated(), fromBlock, latestBlock);

  for (const log of logs) {
    const parsed = log?.args;
    if (!parsed) {
      continue;
    }

    const { eventId, name, price, totalTickets, organizer } = parsed;
    await persistEventCreatedLog(eventId, name, price, totalTickets, organizer);
  }

  setSyncState({ lastProcessedEventCreatedBlock: latestBlock });
  console.log(`[Web3] Synced ${logs.length} historical EventCreated logs`);
}

async function persistEventCancelledLog(eventId) {
  await markOnChainEventCancelled(CONTRACT_ADDRESS, eventId.toString());
}

async function syncHistoricalEventCancelled(contract, provider) {
  const latestBlock = await provider.getBlockNumber();
  const state = getSyncState();
  const lastProcessed = state.lastProcessedEventCancelledBlock;

  const fromBlock =
    Number.isInteger(lastProcessed) && lastProcessed >= 0
      ? lastProcessed + 1
      : Math.max(0, CONTRACT_START_BLOCK || 0);

  if (fromBlock > latestBlock) {
    return;
  }

  console.log(`[Web3] Sync EventCancelled historical logs from block ${fromBlock} to ${latestBlock}`);
  const logs = await contract.queryFilter(contract.filters.EventCancelled(), fromBlock, latestBlock);

  for (const log of logs) {
    const parsed = log?.args;
    if (!parsed) {
      continue;
    }

    const { eventId } = parsed;
    await persistEventCancelledLog(eventId);
  }

  setSyncState({ lastProcessedEventCancelledBlock: latestBlock });
  console.log(`[Web3] Synced ${logs.length} historical EventCancelled logs`);
}

/**
 * listenToBlockchain()
 * Kết nối RPC, lắng nghe event TicketMinted từ Smart Contract thật.
 * ABI được load từ backend/abis/TicketContract.json.
 * Mỗi khi event được phát ra → gọi createTicket() lưu vào DB.
 */
function listenToBlockchain() {
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

    (async () => {
      try {
        // Keep order deterministic: create events first, then apply cancelled flags.
        await syncHistoricalEventCreated(contract, provider);
        await syncHistoricalEventCancelled(contract, provider);
      } catch (err) {
        console.error("[Web3] Failed historical sync pipeline:", err.message);
      }
    })();

    console.log(
      `[Web3] Listening EventCreated and TicketPurchased on contract: ${CONTRACT_ADDRESS}`
    );

    contract.on("EventCreated", async (eventId, name, price, totalTickets, organizer, event) => {
      const blockNumber = event?.log?.blockNumber ?? event?.blockNumber ?? null;

      try {
        await persistEventCreatedLog(eventId, name, price, totalTickets, organizer);

        if (Number.isInteger(blockNumber)) {
          const current = getSyncState().lastProcessedEventCreatedBlock;
          if (current == null || blockNumber > current) {
            setSyncState({ lastProcessedEventCreatedBlock: blockNumber });
          }
        }

        console.log("[Web3] ✅ EventCreated synced:", {
          eventId: eventId.toString(),
          name,
          totalTickets: totalTickets.toString(),
          organizer,
          blockNumber,
        });
      } catch (err) {
        console.error("[Web3] ❌ Failed to sync EventCreated:", err.message);
      }
    });

    contract.on("EventCancelled", async (eventId, event) => {
      const blockNumber = event?.log?.blockNumber ?? event?.blockNumber ?? null;

      try {
        await persistEventCancelledLog(eventId);

        if (Number.isInteger(blockNumber)) {
          const current = getSyncState().lastProcessedEventCancelledBlock;
          if (current == null || blockNumber > current) {
            setSyncState({ lastProcessedEventCancelledBlock: blockNumber });
          }
        }

        console.log("[Web3] ✅ EventCancelled synced:", {
          eventId: eventId.toString(),
          blockNumber,
        });
      } catch (err) {
        console.error("[Web3] ❌ Failed to sync EventCancelled:", err.message);
      }
    });

    console.log(`[Web3] Đang lắng nghe event TicketPurchased trên contract: ${CONTRACT_ADDRESS}`);

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

      try {
        const saved = await createTicket({
          TicketTypeID: Number(eventId),   // eventId từ contract → map vào TicketTypeID
          OwnerWallet:  buyer,             // buyer là địa chỉ người mua
          TokenID:      ticketId.toString(), // ticketId on-chain
          TransactionHash: txHash,
          IsUsed: false,
        });
        console.log("[Web3] ✅ Ticket đã lưu vào DB:", saved);
      } catch (dbErr) {
        console.error("[Web3] ❌ Lỗi khi lưu ticket vào DB:", dbErr.message);
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
