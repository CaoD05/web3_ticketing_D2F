require("dotenv").config();
const { ethers } = require("ethers");
const { createTicket } = require("../models/ticketModel");

// ─── Import ABI từ file JSON (paste ABI thật của bạn vào backend/abis/TicketContract.json) ───
const contractABI = require("../abis/TicketContract.json");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

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

/**
 * listenToBlockchain(io)
 * Kết nối RPC, lắng nghe event TicketPurchased từ Smart Contract thật.
 * ABI được load từ backend/abis/TicketContract.json.
 * Mỗi khi event được phát ra → gọi createTicket() lưu vào DB
 *                             → emit Socket.io 'newTicketPurchased'.
 */
function listenToBlockchain(io) {
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

    console.log(
      `[Web3] Đang lắng nghe event TicketPurchased trên contract: ${CONTRACT_ADDRESS}`
    );

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

        // ─── Socket.io: Bắn thông báo real-time khi vé on-chain được lưu ───
        if (io) {
          io.emit("newTicketPurchased", {
            message: "🎉 Một vé mới vừa được phát hành từ Blockchain!",
            ticket: saved,
          });
        }
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
