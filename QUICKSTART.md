# Quick Start Guide - Web3 Ticketing System

## 🚀 Project Setup

### Prerequisites
- Node.js 16+ and npm
- Git
- Basic understanding of Solidity and Ethereum

### Installation

```bash
# Clone the repository
cd smart-contract

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

## 📝 Configuration

Edit `.env` with your settings:

```env
PRIVATE_KEY=your_wallet_private_key
TREASURY_ADDRESS=0x...your_treasury_address...
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with gas report
npm run test:gas

# Generate coverage report
npm run test:coverage
```

## 🏗️ Compilation

```bash
# Compile smart contracts
npm run compile

# Output: contracts compiled in ./artifacts
```

## 📤 Deployment

### Local Testing
```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy to localhost
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet (Sepolia)
```bash
npm run deploy:testnet
```

### Polygon Mumbai
```bash
npm run deploy:mumbai
```

### Polygon Mainnet
```bash
npm run deploy:polygon
```

### Mainnet (Ethereum)
```bash
npm run deploy:mainnet
```

## 📚 Contract Interaction

### Using Hardhat Console

```bash
# Connect to testnet
npx hardhat console --network sepolia
```

Then in the console:

```javascript
// Load contract
const ticketing = await ethers.getContractAt(
  "TicketingManagementSystem",
  "0x..."  // deployed contract address
);

// Create event (as organizer)
const eventId = await ticketing.createEvent(
  "My Event",
  "Description",
  "Location",
  Math.floor(Date.now() / 1000) + 86400,  // tomorrow
  Math.floor(Date.now() / 1000) + 172800, // day after
  1000,  // total tickets
  ethers.utils.parseEther("0.1"),  // price per ticket
  "QmIPFSHash"
);

// View event
const event = await ticketing.getEvent(1);
console.log(event);
```

## 🔧 Common Tasks

### Verify Contract on Etherscan

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Example:
npx hardhat verify --network sepolia 0x... 0xtreasury_address...
```

### Flatten Contract

```bash
npm run flatten
# Output: Ticket_flattened.sol
```

### Clean Build Artifacts

```bash
npm run clean
```

## 📊 Gas Optimization

Gas costs vary by network. Example on Sepolia testnet:

| Operation | Gas Cost |
|-----------|----------|
| Create Event | ~120,000 |
| Issue 1 Ticket | ~150,000 |
| Issue 10 Tickets | ~900,000 |
| Verify Ticket | ~45,000 |
| List for Resale | ~75,000 |
| Buy from Resale | ~95,000 |
| Transfer Ticket | ~60,000 |

Enable gas reporter:
```bash
REPORT_GAS=true npm test
```

## 🔐 Security Checklist

Before deploying to mainnet:

- [ ] Code audit completed
- [ ] All tests passing
- [ ] Gas optimization reviewed
- [ ] Security review of role-based access
- [ ] Reentrancy protection tested
- [ ] Event emissions verified
- [ ] Error handling comprehensive

## 📖 Key Files

```
smart-contract/
├── contracts/
│   ├── Ticket.sol                      # Main ticketing contract
│   ├── interfaces/
│   │   └── ITicketingManagementSystem.sol
│   └── README.md                       # Detailed documentation
├── scripts/
│   ├── deploy.js                       # Deployment script
│   └── helpers.js                      # Interaction helpers
├── test/
│   └── TicketingSystem.test.js        # Test suite
├── hardhat.config.js                   # Hardhat configuration
├── package.json                        # Dependencies
└── .env.example                        # Environment variables template
```

## 🚨 Troubleshooting

### Compilation Errors
```bash
npm run compile
# Check contract syntax in ./contracts/
```

### Network Connection Issues
```bash
# Verify RPC endpoint in hardhat.config.js
# Test connection: npx hardhat run --network <network> <script>
```

### Insufficient Funds for Gas
```bash
# Get testnet ETH from faucet:
# Sepolia: https://sepolia-faucet.pk910.de/
# Mumbai: https://faucet.polygon.technology/
```

### Package.json Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support & Resources

- Hardhat Docs: https://hardhat.org/docs
- OpenZeppelin Contracts: https://docs.openzeppelin.com/contracts/
- Solidity Docs: https://docs.soliditylang.org/
- Ethers.js Docs: https://docs.ethers.org/

## 🔄 Development Workflow

1. **Make Changes**: Edit contracts in `./contracts`
2. **Compile**: `npm run compile`
3. **Test**: `npm test` - ensure all tests pass
4. **Deploy Testnet**: `npm run deploy:testnet`
5. **Verify**: Check contract on block explorer
6. **Deploy Mainnet**: `npm run deploy:mainnet`

## 📋 Deployment Checklist

- [ ] All tests pass locally
- [ ] Code reviewed
- [ ] Gas optimization verified
- [ ] .env configured with mainnet keys
- [ ] Treasury address set correctly
- [ ] Initial organizers verified (if applicable)
- [ ] Contract verified on block explorer
- [ ] Deployment addresses saved
- [ ] Frontend integration ready

## 🎯 Next Steps

1. Set up frontend application
2. Integrate Web3 wallet connection
3. Implement event creation UI
4. Create ticket marketplace interface
5. Build ticket verification system
6. Add analytics and monitoring

---

**Happy Deploying! 🎉**

For issues or questions, open a GitHub issue or contact the team.
