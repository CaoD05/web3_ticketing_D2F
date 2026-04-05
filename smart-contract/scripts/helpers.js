const hre = require("hardhat");
const fs = require("fs");

// Load deployment
function loadDeployment() {
  const path = `./deployments/${hre.network.name}_deployment.json`;

  if (!fs.existsSync(path)) {
    throw new Error("Deployment file not found. Run deploy first.");
  }

  return JSON.parse(fs.readFileSync(path));
}

// Get contract instance
async function getTicketContract() {
  const deployment = loadDeployment();

  return await hre.ethers.getContractAt(
    "ticket",
    deployment.Ticket
  );
}

// -------------------
// CREATE EVENT
// -------------------
async function createEvent(name, price, totalTickets) {
  const [_, __, organizer] = await hre.ethers.getSigners();
  const ticket = await getTicketContract();

  const tx = await ticket
    .connect(organizer)
    .createEvent(name, price, totalTickets);

  await tx.wait();

  const id = (await ticket.nextEventId()) - 1n;

  console.log("✅ Event created:", id.toString());
  return id;
}

// -------------------
// BUY TICKET
// -------------------
async function buyTicket(eventId, price) {
  const [_, __, ___, user] = await hre.ethers.getSigners();
  const ticket = await getTicketContract();

  const tx = await ticket.connect(user).buyTicket(eventId, {
    value: price,
  });

  await tx.wait();

  const id = (await ticket.nextTicketId()) - 1n;

  console.log("🎟 Ticket bought:", id.toString());
  return id;
}

// -------------------
// VERIFY TICKET
// -------------------
async function verifyTicket(ticketId) {
  const [_, admin] = await hre.ethers.getSigners();
  const ticket = await getTicketContract();

  const tx = await ticket.connect(admin).verifyTicket(ticketId);
  await tx.wait();

  console.log("✅ Ticket verified:", ticketId.toString());
}

// -------------------
// TRANSFER
// -------------------
async function transferTicket(ticketId, to) {
  const [_, __, ___, user] = await hre.ethers.getSigners();
  const ticket = await getTicketContract();

  const tx = await ticket.connect(user).transferTicket(ticketId, to);
  await tx.wait();

  console.log("🔄 Ticket transferred");
}

// -------------------
// WITHDRAW
// -------------------
async function withdrawFunds() {
  const [_, __, organizer] = await hre.ethers.getSigners();
  const ticket = await getTicketContract();

  const tx = await ticket.connect(organizer).withdrawFunds();
  await tx.wait();

  console.log("💰 Withdraw successful");
}

// -------------------
// VIEW FUNCTIONS
// -------------------
async function getEvent(eventId) {
  const ticket = await getTicketContract();
  const e = await ticket.events(eventId);

  console.log("Event:", {
    name: e.name,
    price: hre.ethers.formatEther(e.price),
    sold: e.sold.toString(),
  });

  return e;
}

async function getTicket(ticketId) {
  const ticket = await getTicketContract();
  const t = await ticket.tickets(ticketId);

  console.log("Ticket:", {
    owner: t.owner,
    used: t.used,
  });

  return t;
}

module.exports = {
  createEvent,
  buyTicket,
  verifyTicket,
  transferTicket,
  withdrawFunds,
  getEvent,
  getTicket,
};