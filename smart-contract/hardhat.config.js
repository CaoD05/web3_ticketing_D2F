require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
    },

    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY_ADMIN,
        process.env.PRIVATE_KEY_ORGANIZER,
      ].filter(Boolean),
      chainId: 11155111,
    },
    
  },

  etherscan: {
  apiKey: {
    sepolia: ETHERSCAN_API_KEY,
  },
  customChains: [
    {
      network: "sepolia",
      chainId: 11155111,
      urls: {
        apiURL: "https://api.etherscan.io/v2/api?chainid=11155111",
        browserURL: "https://sepolia.etherscan.io",
      },
    },
  ],
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
