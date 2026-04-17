import ticketArtifact from "../artifacts/contracts/Ticketing.sol/Ticketing.json" assert { type: "json" };

export const CONTRACTS = {
  sepolia: {
    // Keep legacy key for existing code paths.
    Ticket: "0x3389B26251eF16fDE80e7CD0096f556Bc41312Cb",
    Ticketing: {
      address: "0x3389B26251eF16fDE80e7CD0096f556Bc41312Cb",
      abi: ticketArtifact.abi,
    },
  },
};