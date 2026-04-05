const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const adminAddress = process.env.ADMIN_ADDRESS;
  const organizerAddress = process.env.ORGANIZER_ADDRESS;

  console.log("Deploying with:", deployer.address);
  console.log("Admin:", adminAddress);
  console.log("Organizer:", organizerAddress);

  const Ticket = await hre.ethers.getContractFactory("Ticketing");
  const ticket = await Ticket.deploy(deployer.address);

  await ticket.waitForDeployment();

  const address = await ticket.getAddress();
  console.log("Ticket deployed to:", address);

  console.log("Granting roles...");

  await (await ticket.grantAdminRole(adminAddress)).wait();
  await (await ticket.grantOrganizerRole(organizerAddress)).wait();

  console.log("Roles granted");

  const network = hre.network.name;

  const deployment = {
    Ticket: address,
    deployer: deployer.address,
    admin: adminAddress,
    organizer: organizerAddress,
  };

  fs.mkdirSync("./deployments", { recursive: true });

  const path = `./deployments/${network}_deployment.json`;

  fs.writeFileSync(path, JSON.stringify(deployment, null, 2));

  console.log("Deployment saved to:", path);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});