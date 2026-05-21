require("dotenv").config();
const { ethers } = require("ethers");
const path = require("path");

// Load the ABI manually to ensure we have the latest
const contractABI = require("../abis/Ticketing.abi.json");
const RPC_URL = "https://testnet.sapphire.oasis.io";
const CONTRACT_ADDRESS = "0x6F0e5e432497FA4f222dd98CC5e50fc62b2f66Dd";

async function main() {
    console.log("--- 🎟️  NFT Visual Diagnostic ---");
    console.log(`Checking Contract: ${CONTRACT_ADDRESS}\n`);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

    try {
        const nextTicketId = await contract.nextTicketId();
        console.log(`Total Tickets Minted: ${nextTicketId.toString()}\n`);

        if (nextTicketId == 0n) {
            console.log("❌ No tickets minted on this contract yet.");
            return;
        }

        // Check the last 3 tickets
        const start = nextTicketId > 3n ? Number(nextTicketId) - 3 : 0;
        
        for (let i = start; i < Number(nextTicketId); i++) {
            console.log(`[Ticket #${i}]`);
            try {
                const owner = await contract.ownerOf(i);
                const uri = await contract.tokenURI(i);
                
                console.log(`  Owner:     ${owner}`);
                console.log(`  Token URI: ${uri || "EMPTY ⚠️"}`);
                
                if (uri.startsWith("ipfs://")) {
                    const cid = uri.replace("ipfs://", "");
                    console.log(`  Metadata:  https://ipfs.io/ipfs/${cid}`);
                }
            } catch (err) {
                console.log(`  ❌ Error reading ticket: ${err.message}`);
            }
            console.log("");
        }

    } catch (error) {
        console.error("FATAL ERROR:", error.message);
    }
}

main();
