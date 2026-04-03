const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer, admin, organizer] = await hre.ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  // Deploy contract
  const Ticket = await hre.ethers.getContractFactory("ticket");
  const ticket = await Ticket.deploy(deployer.address);
  await ticket.waitForDeployment();

  const address = await ticket.getAddress();
  console.log("✅ Ticket deployed to:", address);

  // Grant roles
  console.log("Granting roles...");
  await ticket.grantAdminRole(admin.address);
  await ticket.grantOrganizerRole(organizer.address);

  console.log("✅ Roles granted");

  // Save deployment
  const network = hre.network.name;
  const deployment = {
    Ticket: address,
    deployer: deployer.address,
    admin: admin.address,
    organizer: organizer.address,
  };

  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }

  fs.writeFileSync(
    `./deployments/${network}_deployment.json`,
    JSON.stringify(deployment, null, 2)
  );

  console.log("📁 Deployment saved to:", `deployments/${network}_deployment.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});