const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const DEPLOYMENT_FILE = path.join(__dirname, "..", "deployments", `${hre.network.name}_deployment.json`);

function loadDeployment() {
	if (!fs.existsSync(DEPLOYMENT_FILE)) {
		throw new Error(`Deployment file not found: ${DEPLOYMENT_FILE}`);
	}

	return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
}

function parseEventIds() {
	const raw = process.env.EVENT_IDS;
	if (!raw) {
		throw new Error("Missing EVENT_IDS. Example: EVENT_IDS=1,3,5,9,12");
	}

	return raw
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean)
		.map((value) => BigInt(value));
}

async function main() {
	const deployment = loadDeployment();
	const eventIds = parseEventIds();
	const contractAddress = deployment.Ticketing?.address ?? deployment.Ticket;

	if (!contractAddress) {
		throw new Error(`No deployed Ticketing address found in ${hre.network.name} deployment file.`);
	}

	const provider = hre.ethers.provider;
	const ticketing = await hre.ethers.getContractAt("Ticketing", contractAddress, provider);
	const latestBlock = await provider.getBlock("latest");
	const now = BigInt(latestBlock.timestamp);

	console.log(`Checking event state on ${hre.network.name}...`);
	console.log("Contract:", contractAddress);
	console.log("Block:", latestBlock.number);
	console.log("Timestamp:", latestBlock.timestamp);

	for (const eventId of eventIds) {
		const eventData = await ticketing.events(eventId);
		const exists = eventData.totalTickets > 0n;
		const soldOut = exists && eventData.sold >= eventData.totalTickets;
		const started = exists && now >= eventData.startTime;
		const isActive = exists && !eventData.cancelled && !soldOut && !started;

		console.log("-");
		console.log(`Event #${eventId.toString()}`);
		console.log(`  name: ${eventData.name}`);
		console.log(`  exists: ${exists}`);
		console.log(`  cancelled: ${eventData.cancelled}`);
		console.log(`  sold: ${eventData.sold.toString()} / ${eventData.totalTickets.toString()}`);
		console.log(`  startTime: ${eventData.startTime.toString()}`);
		console.log(`  started: ${started}`);
		console.log(`  activeDerived: ${isActive}`);
	}
}

main().catch((error) => {
	console.error("Failed to check event status:");
	console.error(error);
	process.exitCode = 1;
});