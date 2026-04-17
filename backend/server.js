require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const prisma = require("./utils/prismaClient");
const { getReadOnlyContract, listenToBlockchain } = require("./services/web3");
const authRoutes = require("./routes/authRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const usersRoutes = require("./routes/usersRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 5000;

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: "*",       // Cho phép mọi origin khi dev/test
    methods: ["GET", "POST"],
  },
});

// Gắn io vào app để Controller truy cập qua req.app.get('io')
app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🟢 Một client vừa kết nối: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`🔴 Client ngắt kết nối: ${socket.id}`);
  });
});

// ─── Express Middlewares ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/api", authRoutes);
app.use("/api", eventsRoutes);
app.use("/api", usersRoutes);
app.use("/api", ticketRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      ok: true,
      message: "Backend is running",
      db: "connected",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Backend is running but database is not connected",
      error: error.message,
    });
  }
});

// ─── Web3 Info ────────────────────────────────────────────────────────────────
app.get("/web3/info", async (_req, res) => {
  try {
    const contract = getReadOnlyContract();
    const [nextEventId, nextTicketId] = await Promise.all([
      contract.nextEventId(),
      contract.nextTicketId(),
    ]);

    res.status(200).json({
      ok: true,
      contractAddress: process.env.CONTRACT_ADDRESS || null,
      nextEventId: nextEventId.toString(),
      nextTicketId: nextTicketId.toString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Unable to read smart contract",
      error: error.message,
    });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
// Dùng server.listen() thay vì app.listen() để Socket.io hoạt động đúng
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io đang sẵn sàng lắng nghe kết nối`);

  // Khởi động Web3 listener — truyền io để emit khi có vé on-chain
  listenToBlockchain(io);

  // simulateBlockchainEvent(); // ← Đã tắt: không dùng mock data nữa
});
