const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const DEPLOYMENT_FILE = path.join(__dirname, "..", "deployments", "sepolia_deployment.json");

const EVENTS = [
	{
		name: "VPBank Hanoi",
		price: hre.ethers.parseEther("0.01"),
		totalTickets: 80n,
		startOffsetSeconds: 2 * 60 * 60,
	},
	{
		name: "FANTASY SHOW",
		price: hre.ethers.parseEther("0.01"),
		totalTickets: 75n,
		startOffsetSeconds: 4 * 60 * 60,
	},
	{
		name: "ĐÊM BẢO TÀNG",
		price: hre.ethers.parseEther("0.01"),
		totalTickets: 100n,
		startOffsetSeconds: 6 * 60 * 60,
	},
];

function loadDeployment() {
	if (!fs.existsSync(DEPLOYMENT_FILE)) {
		throw new Error(`Deployment file not found: ${DEPLOYMENT_FILE}`);
	}

	return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
}

function getStartTime(offsetSeconds) {
	return BigInt(Math.floor(Date.now() / 1000) + offsetSeconds);
}

async function getOrganizerSigner(expectedAddress) {
	const signers = await hre.ethers.getSigners();

	if (!expectedAddress) {
		return signers[2] ?? signers[0];
	}

	const normalizedExpected = expectedAddress.toLowerCase();
	const matchedSigner = signers.find(
		(signer) => signer.address.toLowerCase() === normalizedExpected
	);

	return matchedSigner ?? (signers[2] ?? signers[0]);
}

async function main() {
	const deployment = loadDeployment();
	const contractAddress = deployment.Ticketing?.address ?? deployment.Ticket;

	if (!contractAddress) {
		throw new Error("No deployed Ticketing address found in sepolia deployment file.");
	}

	const organizerSigner = await getOrganizerSigner(deployment.organizer);
	const ticketing = await hre.ethers.getContractAt("Ticketing", contractAddress, organizerSigner);

	console.log("Creating events on Sepolia...");
	console.log("Contract:", contractAddress);
	console.log("Organizer:", organizerSigner.address);

	const createdEvents = [];

	for (const eventConfig of EVENTS) {
		const eventId = await ticketing.nextEventId();
		const startTime = getStartTime(eventConfig.startOffsetSeconds);

		const tx = await ticketing.createEvent(
			eventConfig.name,
			eventConfig.price,
			eventConfig.totalTickets,
			startTime
		);

		console.log(`  Pending event ${eventId.toString()}: ${eventConfig.name}`);
		const receipt = await tx.wait();

		createdEvents.push({
			eventId: eventId.toString(),
			name: eventConfig.name,
			txHash: receipt.hash,
			startTime: startTime.toString(),
		});

		console.log(`  Created event ${eventId.toString()} (${eventConfig.name})`);
	}

	console.log("\nCreated events successfully:");
	for (const eventInfo of createdEvents) {
		console.log(
			`- #${eventInfo.eventId} ${eventInfo.name} | startTime=${eventInfo.startTime} | tx=${eventInfo.txHash}`
		);
	}
}

main().catch((error) => {
	console.error("Failed to create events:");
	console.error(error);
	process.exitCode = 1;
});
