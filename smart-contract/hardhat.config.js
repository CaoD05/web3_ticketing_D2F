require("@nomicfoundation/hardhat-toolbox");
// CRITICAL: You must include the Sapphire plugin for the provider to work correctly!
require("@oasisprotocol/sapphire-hardhat"); 
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SAPPHIRE_TESTNET_RPC_URL = process.env.SAPPHIRE_TESTNET_RPC_URL || "https://testnet.sapphire.oasis.io";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Sapphire is based on the Paris EVM version. 
      // Specifying this avoids issues with newer opcodes (like PUSH0)
      evmVersion: "paris", 
    },
  },

  networks: {
    sapphireTestnet: {
      url: SAPPHIRE_TESTNET_RPC_URL,
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY_ADMIN,
        process.env.PRIVATE_KEY_ORGANIZER,
      ].filter(Boolean),
      chainId: 23295,
    },
  },

  // Sapphire does not support Etherscan-style verification. Use Sourcify instead.
  etherscan: {
    enabled: false,
  },

  // Sourcify is the preferred verification method for Sapphire Testnet
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 40000,
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};
