import ticketArtifact from "../artifacts/contracts/Ticketing.sol/Ticketing.json" assert { type: "json" };

export const CONTRACTS = {
  sepolia: {
    // Keep legacy key for existing code paths.
    Ticket: "0xDb04A3e2d24c904672a5D4CfADDe61EFA0F82430",
    Ticketing: {
      address: "0xDb04A3e2d24c904672a5D4CfADDe61EFA0F82430",
      abi: ticketArtifact.abi,
    },
  },
};