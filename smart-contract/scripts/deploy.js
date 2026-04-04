const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer, admin, organizer] = await hre.ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  const Ticket = await hre.ethers.getContractFactory("Ticketing");
  const ticket = await Ticket.deploy(deployer.address);
  await ticket.waitForDeployment();

  const address = await ticket.getAddress();
  console.log("Ticket deployed to:", address);

  console.log("Granting roles...");

  await (await ticket.grantAdminRole(admin.address)).wait();
  await (await ticket.grantOrganizerRole(organizer.address)).wait();

  console.log("Roles granted");

  const network = hre.network.name;

  const deployment = {
    Ticket: address,
    deployer: deployer.address,
    admin: admin.address,
    organizer: organizer.address,
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