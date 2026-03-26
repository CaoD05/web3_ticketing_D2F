# Quick Start Guide - Web3 Ticketing System

## Prerequisites

Before starting, ensure you have:

- **Node.js 16+** and npm — [Download](https://nodejs.org/)
- **Git** — For version control
- **Ethereum wallet** — With private key for deployments
- **Basic Solidity knowledge** — Recommended for contract interaction
- **Testnet ETH** — For testing on networks like Sepolia

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd smart-contract
npm install
```

### 2. Configure Environment Variables

Copy the example file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PRIVATE_KEY=your_wallet_private_key
TREASURY_ADDRESS=0x...your_treasury_address...
ALCHEMY_API_KEY=your_alchemy_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Note**: Never commit `.env` to version control. Add it to `.gitignore`.

## 🔧 Development Workflow

### Compile Contracts

```bash
npm run compile
```

Output is saved to `./artifacts`.

### Run Tests

```bash
# Run all tests
npm test

# Run tests with gas usage report
npm run test:gas

# Generate coverage report
npm run test:coverage
```

### Deploy

#### Local Testing (Hardhat Network)

```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: In another terminal, deploy
npx hardhat run scripts/deploy.js --network localhost
```

#### Deployment to Available Networks

```bash
# Sepolia Testnet
npm run deploy:testnet

# Polygon Mumbai Testnet
npm run deploy:mumbai

# Polygon Mainnet
npm run deploy:polygon

# Ethereum Mainnet
npm run deploy:mainnet
```

## Contract Interaction

### Using Hardhat Console

Connect to a network and interact with the deployed contract:

```bash
# Connect to testnet
npx hardhat console --network sepolia
```

In the console, you can interact with the contract:

```javascript
// Get contract instance
const ticketing = await ethers.getContractAt(
  "SimpleTicketing",
  "0x..."  // Replace with deployed contract address
);

// Create an event
const tx = await ticketing.createEvent(
  "Concert 2024",
  "A great concert",
  "Madison Square Garden",
  Math.floor(Date.now() / 1000) + 86400,   // Start: tomorrow
  Math.floor(Date.now() / 1000) + 172800,  // End: day after
  1000,                                     // Total tickets
  ethers.utils.parseEther("0.1"),          // Price: 0.1 ETH
  "QmIPFSHash"                             // Metadata URI
);
await tx.wait();

// Get event details
const event = await ticketing.getEvent(1);
console.log(event);
```

## Contract Management

### Verify on Etherscan

After deployment, verify your contract on a block explorer:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <TREASURY_ADDRESS>
```

### Flatten Contract

Create a single file with all dependencies:

```bash
npm run flatten
# Output: contracts/SimpleTicketing_flattened.sol
```

### Clean Build Artifacts

```bash
npm run clean
```

## 📊 Gas Costs Reference

Typical gas usage on Sepolia testnet:

| Operation | Gas Cost |
|-----------|----------|
| Create Event | ~120,000 |
| Issue 1 Ticket | ~150,000 |
| Issue 10 Tickets | ~900,000 |
| Verify Ticket | ~45,000 |
| List for Resale | ~75,000 |
| Buy from Resale | ~95,000 |
| Transfer Ticket | ~60,000 |

Generate a gas report for your tests:

```bash
REPORT_GAS=true npm test
```

## Project Structure

```
smart-contract/
├── contracts/
│   ├── SimpleTicketing.sol           # Main smart contract
│   └── README.md                     # Contract documentation
├── scripts/
│   ├── deploy.js                     # Deployment script
│   └── helpers.js                    # Utility functions
├── test/
│   └── SimpleTicketing.test.js       # Test suite
├── hardhat.config.js                 # Hardhat configuration
├── package.json                      # Dependencies
└── .env.example                      # Environment template
```

## Common Issues & Solutions

### Network Connection Errors

**Error**: `Error: could not detect network (event="noNetwork", ...)`

**Solution**: Verify RPC endpoint in `hardhat.config.js` and test the connection:

```bash
npx hardhat run --network sepolia <script.js>
```

### Insufficient Funds for Gas

**Error**: `Error: insufficient funds for gas * price + value`

**Solution**: Get testnet ETH:
- Sepolia: https://sepolia-faucet.pk910.de/
- Polygon Mumbai: https://faucet.polygon.technology/

### Recompile Contract

If you encounter compilation issues:

```bash
rm -rf artifacts cache
npm run compile
```

### Clear npm Cache

If installation fails:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass: `npm test`
- [ ] Code reviewed by team
- [ ] Gas optimization verified
- [ ] `.env` properly configured with production keys
- [ ] Treasury address is correct
- [ ] Contract verified on block explorer
- [ ] Deployment addresses documented

## Next Steps

1. Review the [ARCHITECTURE.md](ARCHITECTURE.md) for system design details
2. Study the contract in [contracts/SimpleTicketing.sol](contracts/SimpleTicketing.sol)
3. Run local tests and deployment
4. Deploy to Sepolia testnet
5. Verify the contract on Etherscan
6. Integrate with frontend application

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)

---

For questions or issues, open a GitHub issue or contact the development team.
