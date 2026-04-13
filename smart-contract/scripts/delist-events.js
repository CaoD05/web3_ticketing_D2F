const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const DEPLOYMENT_FILE = path.join(__dirname, "..", "deployments", "sepolia_deployment.json");

function loadDeployment() {
	if (!fs.existsSync(DEPLOYMENT_FILE)) {
		throw new Error(`Deployment file not found: ${DEPLOYMENT_FILE}`);
	}

	return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
}

function parseList(value) {
	if (!value) {
		return [];
	}

	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

async function getOperatorSigner(expectedAddress) {
	const signers = await hre.ethers.getSigners();

	if (!expectedAddress) {
		return signers[2] ?? signers[1] ?? signers[0];
	}

	const normalizedExpected = expectedAddress.toLowerCase();
	const matchedSigner = signers.find(
		(signer) => signer.address.toLowerCase() === normalizedExpected
	);

	return matchedSigner ?? (signers[2] ?? signers[1] ?? signers[0]);
}

async function main() {
	const deployment = loadDeployment();
	const contractAddress = deployment.Ticketing?.address ?? deployment.Ticket;

	if (!contractAddress) {
		throw new Error("No deployed Ticketing address found in sepolia deployment file.");
	}

	const eventIds = parseList(process.env.EVENT_IDS).map((value) => BigInt(value));
	const eventNames = parseList(process.env.EVENT_NAMES);
	const operator = await getOperatorSigner(process.env.OPERATOR_ADDRESS ?? deployment.organizer ?? deployment.admin);
	const ticketing = await hre.ethers.getContractAt("Ticketing", contractAddress, operator);

	if (eventIds.length === 0 && eventNames.length === 0) {
		throw new Error(
			"Provide EVENT_IDS and/or EVENT_NAMES. Example: EVENT_NAMES=\"VPBank Hanoi,FANTASY SHOW\""
		);
	}

	console.log("Cancelling misnamed events on Sepolia...");
	console.log("Contract:", contractAddress);
	console.log("Operator:", operator.address);

	const nextEventId = Number(await ticketing.nextEventId());
	const eventIdsToCancel = new Set(eventIds.map((id) => id.toString()));

	if (eventNames.length > 0) {
		for (let eventId = 0; eventId < nextEventId; eventId += 1) {
			const eventData = await ticketing.events(BigInt(eventId));
			if (eventNames.includes(eventData.name)) {
				eventIdsToCancel.add(String(eventId));
			}
		}
	}

	if (eventIdsToCancel.size === 0) {
		console.log("No matching events found to cancel.");
		return;
	}

	for (const eventIdString of eventIdsToCancel) {
		const eventId = BigInt(eventIdString);
		const eventData = await ticketing.events(eventId);

		if (eventData.totalTickets === 0n) {
			console.log(`  Skipping #${eventIdString}: event does not exist`);
			continue;
		}

		if (eventData.cancelled) {
			console.log(`  Skipping #${eventIdString}: already cancelled`);
			continue;
		}

		console.log(`  Cancelling #${eventIdString}: ${eventData.name}`);
		const tx = await ticketing.cancelEvent(eventId);
		const receipt = await tx.wait();
		console.log(`  Cancelled #${eventIdString} | tx=${receipt.hash}`);
	}
}

main().catch((error) => {
	console.error("Failed to cancel events:");
	console.error(error);
	process.exitCode = 1;
});