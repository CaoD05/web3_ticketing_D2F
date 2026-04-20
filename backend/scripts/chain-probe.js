require("dotenv").config();
const { ethers } = require("ethers");
const abi = require("../abis/TicketContract.json");

async function main() {
  const rpc = process.env.RPC_URL;
  const address = process.env.CONTRACT_ADDRESS;
  const from = Number.parseInt(process.env.SYNC_START_BLOCK || "0", 10);

  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(address, abi, provider);
  const latest = await provider.getBlockNumber();
  const events = await contract.queryFilter(contract.filters.TicketPurchased(), from, latest);

  console.log("CONTRACT", address);
  console.log("FROM_BLOCK", from);
  console.log("LATEST_BLOCK", latest);
  console.log("TICKET_PURCHASED_COUNT", events.length);

  const sample = events.slice(-5).map((ev) => ({
    blockNumber: ev.blockNumber,
    txHash: ev.transactionHash,
    ticketId: ev.args?.[0]?.toString(),
    eventId: ev.args?.[1]?.toString(),
    buyer: ev.args?.[2],
  }));

  console.log("LATEST_EVENTS", JSON.stringify(sample, null, 2));
}

main().catch((e) => {
  console.error("CHAIN_PROBE_ERROR", e);
  process.exitCode = 1;
});
