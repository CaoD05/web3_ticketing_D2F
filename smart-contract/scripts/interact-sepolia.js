/**
 * Sepolia Interaction Script for Ticketing.sol
 *
 * Usage:
 *   npx hardhat run scripts/interact-sepolia.js --network sepolia
 */

const hre = require("hardhat");

const CONTRACT_ADDRESS = "0x3389B26251eF16fDE80e7CD0096f556Bc41312Cb";

// ─── HELPERS ───────────────────────────────────────────────────────────────

function log(section, msg) {
  console.log(`\n[${section}] ${msg}`);
}

function inFuture(seconds) {
  return Math.floor(Date.now() / 1000) + seconds;
}

async function getContract(signer) {
  const artifact = await hre.artifacts.readArtifact("Ticketing");
  return new hre.ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

async function waitAndLog(tx, label) {
  process.stdout.write(`  ⏳ ${label}...`);
  const receipt = await tx.wait();
  console.log(` ✅  tx: ${receipt.hash}`);
  return receipt;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  const { ethers } = hre;
  const provider = ethers.provider;

  // Load signers
  const signers   = await ethers.getSigners();
  const owner     = signers[0];
  const admin     = signers[1] ?? signers[0];
  const organizer = signers[2] ?? signers[0];

  console.log("=".repeat(60));
  console.log("  Ticketing Contract — Sepolia Interaction Script");
  console.log("=".repeat(60));
  console.log(`  Owner/Deployer: ${owner.address}`);
  console.log(`  Admin:          ${admin.address}`);
  console.log(`  Organizer:      ${organizer.address}`);
  console.log(`  Contract:       ${CONTRACT_ADDRESS}`);

  const balance = await provider.getBalance(owner.address);
  console.log(`  Balance:        ${ethers.formatEther(balance)} ETH`);

  // ── 1. Read contract state ──────────────────────────────────────────────

  log("READ", "Checking contract state...");
  const ticketAsOwner     = await getContract(owner);
  const ticketAsOrganizer = await getContract(organizer);
  const ticketAsAdmin     = await getContract(admin);

  const nextEventId  = await ticketAsOwner.nextEventId();
  const nextTicketId = await ticketAsOwner.nextTicketId();
  console.log(`  nextEventId:  ${nextEventId.toString()}`);
  console.log(`  nextTicketId: ${nextTicketId.toString()}`);

  // ── 2. Grant roles ──────────────────────────────────────────────────────

  log("ROLES", "Granting roles to admin and organizer...");

  const ADMIN_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const ORGANIZER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZER_ROLE"));

  const hasAdminRole     = await ticketAsOwner.hasRole(ADMIN_ROLE,     admin.address);
  const hasOrganizerRole = await ticketAsOwner.hasRole(ORGANIZER_ROLE, organizer.address);

  if (!hasAdminRole) {
    const tx = await ticketAsOwner.grantAdminRole(admin.address);
    await waitAndLog(tx, `grantAdminRole → ${admin.address}`);
  } else {
    console.log(`  ✅ Admin role already granted to ${admin.address}`);
  }

  if (!hasOrganizerRole) {
    const tx = await ticketAsOwner.grantOrganizerRole(organizer.address);
    await waitAndLog(tx, `grantOrganizerRole → ${organizer.address}`);
  } else {
    console.log(`  ✅ Organizer role already granted to ${organizer.address}`);
  }

  // ── 3. Create an event ──────────────────────────────────────────────────

  log("CREATE EVENT", "Organizer creating a new event...");
  const eventPrice   = ethers.parseEther("0.001");
  const totalTickets = 5n;
  const startTime    = inFuture(7200);

  const createTx = await ticketAsOrganizer.createEvent(
    `Sepolia Live #${Date.now()}`,
    eventPrice,
    totalTickets,
    startTime
  );
  await waitAndLog(createTx, "createEvent");

  const eventId = Number(await ticketAsOwner.nextEventId()) - 1;
  console.log(`  Created Event ID: ${eventId}`);

  // ── 4. Read event ───────────────────────────────────────────────────────

  log("READ EVENT", `Fetching event ${eventId}...`);
  const ev = await ticketAsOwner.events(BigInt(eventId));
  console.log(`  Name:      ${ev.name}`);
  console.log(`  Price:     ${ethers.formatEther(ev.price)} ETH`);
  console.log(`  Tickets:   ${ev.totalTickets.toString()}`);
  console.log(`  Organizer: ${ev.organizer}`);
  console.log(`  Cancelled: ${ev.cancelled}`);

  // ── 5. Check remaining tickets ──────────────────────────────────────────

  log("REMAINING", "Checking available tickets...");
  const remaining = await ticketAsOwner.remainingTickets(BigInt(eventId));
  console.log(`  Remaining: ${remaining.toString()} / ${totalTickets.toString()}`);

  // ── 6. Buy a ticket ─────────────────────────────────────────────────────

  log("BUY TICKET", `Owner buying ticket for event ${eventId}...`);
  const buyTx = await ticketAsOwner.buyTicket(BigInt(eventId), { value: eventPrice });
  await waitAndLog(buyTx, "buyTicket");

  const ticketId = Number(await ticketAsOwner.nextTicketId()) - 1;
  console.log(`  Bought Ticket ID: ${ticketId}`);

  // ── 7. Read ticket ──────────────────────────────────────────────────────

  log("READ TICKET", `Fetching ticket ${ticketId}...`);
  const t = await ticketAsOwner.tickets(BigInt(ticketId));
  console.log(`  Owner:       ${t.owner}`);
  console.log(`  EventId:     ${t.eventId.toString()}`);
  console.log(`  Used:        ${t.used}`);
  console.log(`  ResalePrice: ${t.resalePrice.toString()}`);

  // ── 8. Check withdrawable funds ─────────────────────────────────────────

  log("FUNDS", "Checking organizer withdrawable funds...");
  const funds = await ticketAsOwner.withdrawableFunds(organizer.address);
  console.log(`  Organizer withdrawable: ${ethers.formatEther(funds)} ETH`);

  // ── 9. List for resale ──────────────────────────────────────────────────

  log("RESALE LIST", `Listing ticket ${ticketId} for resale...`);
  const resalePrice = (eventPrice * 110n) / 100n;
  const listTx = await ticketAsOwner.listForResale(BigInt(ticketId), resalePrice);
  await waitAndLog(listTx, "listForResale");
  console.log(`  Listed at: ${ethers.formatEther(resalePrice)} ETH`);

  // ── 10. Delist from resale ──────────────────────────────────────────────

  log("RESALE DELIST", `Delisting ticket ${ticketId}...`);
  const delistTx = await ticketAsOwner.delistResale(BigInt(ticketId));
  await waitAndLog(delistTx, "delistResale");

  // ── 11. Admin verifies ticket ───────────────────────────────────────────

  log("VERIFY TICKET", `Admin verifying ticket ${ticketId}...`);
  const verifyTx = await ticketAsAdmin.verifyTicket(BigInt(ticketId));
  await waitAndLog(verifyTx, "verifyTicket");

  const tAfter = await ticketAsOwner.tickets(BigInt(ticketId));
  console.log(`  Ticket used: ${tAfter.used}`);

  // ── 12. Organizer withdraws funds ───────────────────────────────────────

  log("WITHDRAW", "Organizer withdrawing funds...");
  const withdrawable = await ticketAsOwner.withdrawableFunds(organizer.address);
  if (withdrawable > 0n) {
    const withdrawTx = await ticketAsOrganizer.withdrawFunds();
    await waitAndLog(withdrawTx, "withdrawFunds");
    console.log(`  Withdrew: ${ethers.formatEther(withdrawable)} ETH`);
  } else {
    console.log("  No funds to withdraw.");
  }

  // ── 13. Cancel + refund flow ────────────────────────────────────────────

  log("CANCEL FLOW", "Creating event for cancel+refund test...");
  const createTx2 = await ticketAsOrganizer.createEvent(
    `Cancel Test #${Date.now()}`,
    eventPrice,
    3n,
    inFuture(7200)
  );
  await waitAndLog(createTx2, "createEvent (cancel test)");

  const cancelEventId  = Number(await ticketAsOwner.nextEventId()) - 1;
  const cancelTicketId = Number(await ticketAsOwner.nextTicketId());

  const buyTx2 = await ticketAsOwner.buyTicket(BigInt(cancelEventId), { value: eventPrice });
  await waitAndLog(buyTx2, "buyTicket (cancel test)");

  log("CANCEL", `Admin cancelling event ${cancelEventId}...`);
  const cancelTx = await ticketAsAdmin.cancelEvent(BigInt(cancelEventId));
  await waitAndLog(cancelTx, "cancelEvent");

  log("REFUND", `Owner claiming refund for ticket ${cancelTicketId}...`);
  const balBefore  = await provider.getBalance(owner.address);
  const refundTx   = await ticketAsOwner.claimRefund(BigInt(cancelTicketId));
  const refReceipt = await waitAndLog(refundTx, "claimRefund");
  const gas        = refReceipt.gasUsed * refReceipt.gasPrice;
  const balAfter   = await provider.getBalance(owner.address);
  const refunded   = balAfter + gas - balBefore;
  console.log(`  Refunded: ${ethers.formatEther(refunded)} ETH`);

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(60));
  console.log("  ✅  All interactions completed successfully!");
  console.log("=".repeat(60));
  console.log(`\n  View on Etherscan:`);
  console.log(`  https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}\n`);
}

main()
  .catch((err) => {
    console.error("\n❌ Error:", err.message || err);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(), 500); // fix Windows UV_HANDLE_CLOSING crash
  });