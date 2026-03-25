# System Architecture & Design

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Data Model](#data-model)
3. [Security & Access Control](#security--access-control)
4. [Tokenomics & Economics](#tokenomics--economics)
5. [Workflow Diagrams](#workflow-diagrams)

## High-Level Architecture

The Web3 Ticketing System is built in multiple layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│  (React/Vue - Web3 Integration, User Interface)              │
└────────────────┬────────────────────────────────────────────┘
                 │ Web3.js / Ethers.js
                 │
┌────────────────▼────────────────────────────────────────────┐
│            Smart Contract Layer (Blockchain)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  SimpleTicketing (ERC721 + Custom Logic)              │ │
│  │  • Event management      • Ticket verification        │ │
│  │  • Ticket minting       • Resale marketplace         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Role-Based Access Control (RBAC)              │ │
│  │  • ADMIN_ROLE — Platform operations                  │ │
│  │  • EVENT_CREATOR_ROLE — Organizer functions         │ │
│  │  • USER_ROLE — Default permission level (default)   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Storage & Indexing Layer                        │
│  • Event logs and blockchain events                         │
│  • Optional: TheGraph subgraphs for indexing               │
│  • Optional: IPFS for off-chain metadata storage           │
└──────────────────────────────────────────────────────────────┘
```

### Key Components

- **Smart Contract**: Deployed on Ethereum/Polygon networks
- **Frontend**: Web3-enabled application for user interaction
- **Blockchain Network**: Ethereum, Sepolia, Polygon, or local node
- **Off-chain Storage**: IPFS (optional) for metadata

## Data Model

### Entities and Relationships

```
┌─────────────────┐
│     Events      │
├─────────────────┤
│ eventId (PK)    │◄──────────┐
│ organizer       │           │ 1..* relationship
│ name            │           │
│ location        │           │
│ startDate       │           │
│ endDate         │           │
│ totalTickets    │           │
│ ticketPrice     │           │
└─────────────────┘           │
                              │
                        ┌─────────────────┐
                        │    Tickets      │
                        ├─────────────────┤
                        │ ticketId (PK)   │
                        │ eventId (FK)───►│
                        │ originalHolder  │
                        │ currentHolder   │
                        │ seatNumber      │
                        │ category        │
                        │ isVerified      │
                        │ isUsed          │
                        │ resalePrice     │
                        │ isForResale     │
                        │ issuedAt        │
                        └────────┬────────┘
                                 │ 1..1 relationship
                        ┌────────▼────────┐
                        │  ResaleListings │
                        ├─────────────────┤
                        │ ticketId (FK)   │
                        │ seller          │
                        │ price           │
                        │ isActive        │
                        │ listingDate     │
                        └─────────────────┘
```

### Data Attributes

**Event**:
- Unique identifier and organizer address
- Event name, location, start/end times
- Total tickets available and price per ticket
- Metadata URI for off-chain data storage

**Ticket**:
- Unique NFT token ID
- Event reference
- Original and current holder addresses
- Seat/section information and category
- Verification status and usage status
- Resale price and listing status

**Resale Listing**:
- Links ticket to a seller and asking price
- Tracks active/inactive status
- Records listing timestamp

## 🔐 Security & Access Control

### Access Control Hierarchy

```
                ┌─────────────────────────────────┐
                │   DEFAULT_ADMIN_ROLE            │
                │  (Contract Deployer/Owner)      │
                └────────┬────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────────┐ ┌────────────────┐ ┌──────────────┐
│   ADMIN_ROLE     │ │ EVENT_CREATOR  │ │  USER_ROLE   │
│                  │ │   (Organizer)  │ │  (Default)   │
├──────────────────┤ ├────────────────┤ ├──────────────┤
│ • Verify tickets │ │ • Create events│ │ • Buy tickets│
│ • Mark as used   │ │ • Issue tickets│ │ • Transfer   │
│ • Withdraw funds │ │ • Cancel events│ │ • Resell     │
│ • Set fees       │ │ • View revenue │ │ • Verify     │
└──────────────────┘ └────────────────┘ └──────────────┘
```

### Security Mechanisms

1. **Reentrancy Protection**: `ReentrancyGuard` on all payment and transfer functions
2. **Role-Based Access Control**: Granular permissions using OpenZeppelin's AccessControl
3. **Input Validation**: All user inputs validated before processing
4. **Safe Transfers**: ERC721 safe transfer methods and checks on ETH transfers
5. **Event Logging**: Complete audit trail through blockchain event emissions
6. **Immutable Records**: Blockchain ensures transaction history cannot be altered

## 💰 Tokenomics & Economics

### Fee Structure

```
Primary Sale (Direct from Organizer):
  Ticket Price: 0.1 ETH
  ├─ Organizer Receives: 0.1 ETH (100%)
  └─ Platform Fee: None

Secondary Sale (Resale Marketplace):
  Listing Price: 0.15 ETH
  ├─ Seller Receives: 0.147 ETH (98%)
  ├─ Platform Fee: 0.003 ETH (2%)
  └─ Treasury: Accumulates platform fees
```

### Revenue Model

- **Primary**: No platform fee — organizers receive full ticket price
- **Secondary**: 2% platform fee on resales (adjustable up to 10% via governance)
- **Treasury**: Collects and manages all platform fees

### Economic Incentives

- Organizers benefit from direct pricing on primary sales
- Secondary market enables users to sell unused tickets
- Platform grows from resale activity without impacting primary sales

## Workflow Diagrams

### Event Creation Flow

```
Event Organizer
   │
   ├─ 1. Setup Event
   │    └─ Provide: name, location, dates, capacity, price
   │
   ├─ 2. Create Event
   │    └─ Event stored with metadata and settings
   │
   ├─ 3. Issue Tickets
   │    ├─ Mint NFT for each ticket
   │    ├─ Assign seat numbers and categories
   │    └─ Attach metadata URIs
   │
   └─ 4. Event Active
        └─ Ready for ticket distribution/sales
```

### Ticket Lifecycle

```
State Transitions:

Created
   │
   ├─ Verified
   │  └─ Used (Scanned at event entry)
   │     └─ Final State
   │
   └─ Listed for Resale
      ├─ Purchased
      │  └─ Returns to "Created" state (new owner)
      │
      └─ Delisted
         └─ Owner keeps ticket
```

### Resale Transaction Flow

```
Step 1: Seller Lists Ticket
   ├─ Set isForResale = true
   ├─ Set resalePrice parameter
   └─ Create ResaleListing entry

Step 2: Buyer Purchases
   ├─ Send payment (exact resalePrice amount)
   │
   ├─ Platform collects 2% fee
   │  └─ Added to treasury balance
   │
   ├─ Seller receives 98% of price
   │  └─ Transferred via secure payment function
   │
   └─ Ticket transferred to buyer
      ├─ currentHolder = buyer address
      ├─ isForResale = false (reset)
      └─ resalePrice = 0 (reset)
```

## Integration Points

### External Interactions

- **RPC Endpoints**: Alchemy, Infura, or custom nodes for blockchain communication
- **IPFS** (Optional): Decentralized storage for event metadata and images
- **Block Explorers**: Etherscan and PolygonScan for verification and monitoring
- **Wallets**: MetaMask, WalletConnect for user transaction signing

### Contract Interfaces

- **ERC721**: Standard NFT interface for ticket tokens
- **AccessControl**: OpenZeppelin's role-based access pattern
- **ReentrancyGuard**: Protection against reentrancy attacks

---

For implementation details, see [contracts/SimpleTicketing.sol](contracts/SimpleTicketing.sol).

## 🗄️ Data Storage Optimization

### On-Chain Storage

```
Critical Data (Immutable):
├─ Event details
├─ Ticket ownership
├─ Original holders
├─ Verification status
└─ Usage tracking

Gas-Efficient Patterns:
├─ Mappings for O(1) lookups
├─ Arrays for enumeration
├─ Counters for ID generation
└─ Events for off-chain indexing
```

### Off-Chain Storage (Recommended)

```
IPFS:
├─ Event metadata & images
├─ Ticket artwork & attributes
└─ Organizer information

The Graph / Subgraph:
├─ Indexed events
├─ Ticket transfer history
├─ Resale listings
└─ User statistics

Frontend Database:
├─ User profiles
├─ Transaction history
├─ Favorites/bookmarks
└─ Notifications
```

## 🎯 Deployment Architecture

### Multi-Network Support

```
┌─────────────────────────────────────────┐
│      Smart Contract Deployment          │
├──────────────┬──────────────┬───────────┤
│   Testnet    │   Mainnet    │  Layer 2  │
├──────────────┼──────────────┼───────────┤
│ • Sepolia    │ • Ethereum   │ • Polygon │
│ • Goerli     │ • Mainnet    │ • Arbitum │
│ • Mumbai     │              │ • Optimism│
└──────────────┴──────────────┴───────────┘
```

## 🔌 Integration Points

### Frontend Integration

```javascript
// Web3 Connection
provider = new ethers.providers.Web3Provider(window.ethereum)
contract = new ethers.Contract(address, ABI, signer)

// Event Listeners
contract.on("TicketIssued", (ticketId, eventId, holder, seat) => {
  // Update UI
})

contract.on("ResaleSale", (ticketId, seller, buyer, price) => {
  // Update marketplace
})
```

### Backend Integration

```javascript
// Subgraph Query
query {
  events(first: 10) {
    id
    name
    organizer
    totalTickets
    ticketsIssued
  }
}

// Event Indexing
events.on("EventCreated", (eventId, organizer, name) => {
  // Store in database
})
```

## 📈 Scalability Considerations

### Current Limitations
- Deployed on single blockchain network
- Event logs stored on-chain
- Limited by block gas limits

### Scaling Solutions
- **Layer 2**: Deploy on Polygon/Arbitrum for lower fees
- **Batching**: Batch multiple ticket operations
- **Caching**: Use The Graph for faster queries
- **Pagination**: Implement pagination for large datasets

## 🛡️ Threat Model & Mitigations

| Threat | Mitigation |
|--------|------------|
| Double Spending | NFT ownership + blockchain | 
| Fraudulent Tickets | Organizer verification + Admin validation |
| Reentrancy | ReentrancyGuard on payments |
| Unauthorized Access | Role-based access control |
| Lost Funds | Refund on failed purchases |
| Used Ticket Reuse | isUsed flag prevents transfer |
| Organizer Fraud | KYC verification + reputation |

## 📊 Monitoring & Analytics

### Key Metrics to Track

```
Events:
├─ Total created
├─ Total revenue
├─ Attendance rates
└─ Cancellation rate

Tickets:
├─ Total issued
├─ Used vs. active
├─ Resale volume
└─ Average resale markup

Users:
├─ Organizers verified
├─ Total attendees
├─ Repeat buyers
└─ Average transaction value

Platform:
├─ Total fees collected
├─ Gas costs
├─ Transaction success rate
└─ System uptime
```

---

**Last Updated**: 2026-03-26
**Version**: 1.0.0
