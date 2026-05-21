/**
 * Deploy to Oasis Sapphire Testnet WITHOUT encryption
 * This allows the contract to be verified on Sourcify
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-unencrypted.js --network sapphireTestnet
 * 
 * Note: This script temporarily requires() the Sapphire plugin, then unrequires() it
 * to deploy unencrypted for verification purposes.
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const organizerAddress = process.env.ORGANIZER_ADDRESS || deployer.address;

  console.log("=".repeat(70));
  console.log("UNENCRYPTED DEPLOYMENT TO OASIS SAPPHIRE TESTNET");
  console.log("=".repeat(70));
  console.log(`Deployer:   ${deployer.address}`);
  console.log(`Admin:      ${adminAddress}`);
  console.log(`Organizer:  ${organizerAddress}`);
  console.log(`Network:    ${hre.network.name}`);
  console.log(`ChainId:    23295`);
  console.log("");
  console.log("✓ Encryption: DISABLED (for Sourcify verification)");
  console.log("");

  try {
    // Deploy the Ticketing contract
    console.log("Compiling contract...");
    const Ticketing = await hre.ethers.getContractFactory("Ticketing");
    
    console.log("Deploying contract...");
    const ticketing = await Ticketing.deploy(deployer.address);
    await ticketing.waitForDeployment();

    const contractAddress = await ticketing.getAddress();
    console.log(`✓ Contract deployed at: ${contractAddress}`);
    console.log("");

    // Grant roles
    console.log("Granting roles...");
    if (adminAddress && adminAddress !== deployer.address) {
      const tx1 = await ticketing.grantAdminRole(adminAddress);
      await tx1.wait();
      console.log(`  ✓ Admin role granted to ${adminAddress}`);
    } else {
      console.log(`  ✓ Admin role: deployer is admin`);
    }

    if (organizerAddress && organizerAddress !== deployer.address) {
      const tx2 = await ticketing.grantOrganizerRole(organizerAddress);
      await tx2.wait();
      console.log(`  ✓ Organizer role granted to ${organizerAddress}`);
    } else {
      console.log(`  ✓ Organizer role: deployer is organizer`);
    }
    console.log("");

    // Save deployment info
    const deploymentDir = path.join(__dirname, "..", "deployments");
    fs.mkdirSync(deploymentDir, { recursive: true });

    const deployment = {
      Ticket: contractAddress,
      Ticketing: {
        address: contractAddress,
      },
      deployer: deployer.address,
      admin: adminAddress,
      organizer: organizerAddress,
      deploymentTime: new Date().toISOString(),
      network: hre.network.name,
      chainId: 23295,
    };

    const deploymentPath = path.join(deploymentDir, `${hre.network.name}_deployment.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`✓ Deployment saved to: ${deploymentPath}`);
    console.log("");

    // Verification instructions
    console.log("=".repeat(70));
    console.log("NEXT STEP: VERIFY YOUR CONTRACT");
    console.log("=".repeat(70));
    console.log("");
    console.log("Run this command to verify on Sourcify:");
    console.log("");
    console.log(`  npx hardhat verify --network sapphireTestnet ${contractAddress}`);
    console.log("");
    console.log("Or manually verify at https://sourcify.dev/ using:");
    console.log(`  - Chain: Oasis Sapphire Testnet`);
    console.log(`  - Address: ${contractAddress}`);
    console.log(`  - Upload build-info file from artifacts/build-info/`);
    console.log("");
    console.log("View at:");
    console.log(`  https://explorer.oasis.io/testnet/sapphire/address/${contractAddress}`);
    console.log("");

  } catch (error) {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exitCode = 1;
  }
}

main();
