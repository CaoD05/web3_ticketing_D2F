const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of SimpleTicketing...");

  // Get deployer accounts
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy the ticketing contract
  const SimpleTicketing = await hre.ethers.getContractFactory(
    "SimpleTicketing"
  );

  const ticketing = await SimpleTicketing.deploy();
  await ticketing.deployed();

  console.log("✓ SimpleTicketing deployed to:", ticketing.address);

  // Save deployment addresses
  const deployment = {
    SimpleTicketing: ticketing.address,
    Deployer: deployer.address,
    Network: (await ethers.provider.getNetwork()).name,
    Timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  const deploymentPath = `./deployments/${(await ethers.provider.getNetwork()).name}_deployment.json`;

  // Create deployments directory if it doesn't exist
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n✓ Deployment configuration saved to:", deploymentPath);

  console.log("\n=== Deployment Summary ===");
  console.log("SimpleTicketing:", ticketing.address);
  console.log("Deployer:", deployer.address);

  // Verify contract on block explorer (if on a public network)
  if (process.env.ETHERSCAN_API_KEY && (await ethers.provider.getNetwork()).name !== "hardhat") {
    console.log("\nVerifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: ticketing.address,
        constructorArguments: [],
      });
      console.log("✓ Contract verified on block explorer");
    } catch (error) {
      console.log("Verification pending or failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
