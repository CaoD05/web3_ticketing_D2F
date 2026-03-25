const hre = require("hardhat");

/**
 * Common interactions with the Simple Ticketing System
 */

// Load deployment configuration
function loadDeployment(networkName) {
  const fs = require("fs");
  const path = `./deployments/${networkName}_deployment.json`;
  if (!fs.existsSync(path)) {
    throw new Error(`Deployment file not found: ${path}`);
  }
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

// Create event
async function createEvent(name, price, totalTickets) {
  const [creator] = await ethers.getSigners();
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  console.log(`Creating event: ${name}`);
  console.log(`  Price: ${ethers.utils.formatEther(price)} ETH`);
  console.log(`  Total Tickets: ${totalTickets}`);

  const tx = await ticketing.createEvent(name, price, totalTickets);
  const receipt = await tx.wait();

  const nextEventId = await ticketing.nextEventId();
  const eventId = nextEventId - 1;

  console.log("✓ Event created with ID:", eventId.toString());
  return eventId;
}

// Buy ticket
async function buyTicket(eventId, price) {
  const [buyer] = await ethers.getSigners();
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  console.log(`Purchasing ticket for event ${eventId}`);
  
  const tx = await ticketing.buyTicket(eventId, {
    value: price,
  });

  const receipt = await tx.wait();
  const nextTicketId = await ticketing.nextTicketId();
  const ticketId = nextTicketId - 1;

  console.log("✓ Ticket purchased with ID:", ticketId.toString());
  return ticketId;
}

// Use ticket (mark as used)
async function useTicket(ticketId) {
  const [user] = await ethers.getSigners();
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  console.log(`Using ticket ${ticketId}`);
  
  const tx = await ticketing.useTicket(ticketId);
  const receipt = await tx.wait();
  console.log("✓ Ticket marked as used, tx hash:", receipt.transactionHash);
}

// Transfer ticket
async function transferTicket(ticketId, recipientAddress) {
  const [owner] = await ethers.getSigners();
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  console.log(`Transferring ticket ${ticketId} to ${recipientAddress}`);
  
  const tx = await ticketing.transferTicket(ticketId, recipientAddress);
  const receipt = await tx.wait();
  console.log("✓ Ticket transferred, tx hash:", receipt.transactionHash);
  return receipt;
}

// Get event details
async function getEventDetails(eventId) {
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  const event = await ticketing.events(eventId);
  console.log("Event Details:");
  console.log("  ID:", eventId.toString());
  console.log("  Name:", event.name);
  console.log("  Price:", ethers.utils.formatEther(event.price), "ETH");
  console.log("  Total Tickets:", event.totalTickets.toString());
  console.log("  Sold:", event.sold.toString());
  console.log("  Available:", (event.totalTickets - event.sold).toString());
  console.log("  Organizer:", event.organizer);
  return event;
}

// Get ticket details
async function getTicketDetails(ticketId) {
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  const ticket = await ticketing.tickets(ticketId);
  console.log("Ticket Details:");
  console.log("  ID:", ticketId.toString());
  console.log("  Event ID:", ticket.eventId.toString());
  console.log("  Owner:", ticket.owner);
  console.log("  Status:", ticket.used ? "USED" : "VALID");
  return ticket;
}

// Get next event ID
async function getNextEventId() {
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  const nextId = await ticketing.nextEventId();
  return nextId;
}

// Get next ticket ID
async function getNextTicketId() {
  const deployment = loadDeployment((await ethers.provider.getNetwork()).name);
  
  const ticketing = await hre.ethers.getContractAt(
    "SimpleTicketing",
    deployment.SimpleTicketing
  );

  const nextId = await ticketing.nextTicketId();
  return nextId;
}

module.exports = {
  loadDeployment,
  createEvent,
  buyTicket,
  useTicket,
  transferTicket,
  getEventDetails,
  getTicketDetails,
  getNextEventId,
  getNextTicketId,
};
