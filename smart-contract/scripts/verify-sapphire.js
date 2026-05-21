/**
 * Verify a contract on Oasis Sapphire Testnet using Sourcify
 * 
 * Usage:
 *   npx hardhat run scripts/verify-sapphire.js --network sapphireTestnet
 * 
 * Or use hardhat-verify directly:
 *   npx hardhat verify --network sapphireTestnet <CONTRACT_ADDRESS>
 * 
 * IMPORTANT: For verification to work on Sapphire, you must:
 * 1. Deploy WITHOUT encryption (comment out @oasisprotocol/sapphire-hardhat in hardhat.config.js)
 * 2. Use the correct chainId: 23295
 * 3. Use Sourcify verification (not Etherscan)
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentFile = path.join(__dirname, "..", "deployments", "sapphireTestnet_deployment.json");
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deployment.Ticket || deployment.Ticketing?.address;

  if (!contractAddress) {
    throw new Error("No contract address found in deployment file");
  }

  console.log("=".repeat(60));
  console.log("Verifying contract on Oasis Sapphire Testnet");
  console.log("=".repeat(60));
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`ChainId: 23295`);
  console.log("");

  try {
    // Check if build-info exists
    const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");
    if (!fs.existsSync(buildInfoDir)) {
      console.error("❌ ERROR: No build-info artifacts found!");
      console.error("   Run 'npm run compile' first to generate artifacts.");
      process.exit(1);
    }

    const buildInfoFiles = fs.readdirSync(buildInfoDir);
    if (buildInfoFiles.length === 0) {
      console.error("❌ ERROR: build-info directory is empty!");
      console.error("   Run 'npm run compile' to generate build artifacts.");
      process.exit(1);
    }

    console.log(`✓ Found ${buildInfoFiles.length} build-info file(s)`);
    console.log("");
    console.log("To verify your contract on Sourcify, run:");
    console.log("");
    console.log(`  npx hardhat verify --network sapphireTestnet ${contractAddress}`);
    console.log("");
    console.log("Sourcify will use the build-info artifacts to match your contract.");
    console.log("The verification typically takes a few seconds to a minute.");
    console.log("");
    console.log("View your contract at:");
    console.log(`https://explorer.oasis.io/testnet/sapphire/address/${contractAddress}`);
    console.log("");

  } catch (error) {
    console.error("❌ Verification error:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
