require("dotenv").config();
const express = require("express");
const cors = require("cors");

const db = require("./config/db");
const { getReadOnlyContract, listenToBlockchain } = require("./services/web3");
const eventsRoutes = require("./routes/eventsRoutes");
const usersRoutes = require("./routes/usersRoutes");
const ticketRoutes = require("./routes/ticketRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());
app.use("/api", eventsRoutes);
app.use("/api", usersRoutes);
app.use("/api", ticketRoutes);

app.get("/health", async (_req, res) => {
  try {
    await db.query("SELECT 1 AS ok");
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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  // Khởi động Web3 listener (lắng nghe blockchain thật)
  listenToBlockchain();

  // simulateBlockchainEvent(); // ← Đã tắt: không dùng mock data nữa
});
