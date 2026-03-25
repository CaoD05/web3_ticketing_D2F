# System Architecture & Design

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│  (React/Vue - Web3 Integration, UI/UX)                      │
└────────────────┬────────────────────────────────────────────┘
                 │ Web3.js / Ethers.js
                 │
┌────────────────▼────────────────────────────────────────────┐
│            Smart Contract Layer (Blockchain)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  TicketingManagementSystem (ERC721 + Custom Logic)    │ │
│  │  ┌──────────────┬──────────┬────────┬──────────────┐  │ │
│  │  │   Events     │ Tickets  │ Resale │ Verification│  │ │
│  │  └──────────────┴──────────┴────────┴──────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Role-Based Access Control (RBAC)              │ │
│  │  - ADMIN_ROLE (Platform operations)                   │ │
│  │  - EVENT_CREATOR_ROLE (Organizer functions)          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Storage & Indexing Layer                        │
│  ┌──────────────┬────────────┬─────────────────────────┐   │
│  │   Events     │ TheGraph   │ IPFS (Metadata)        │   │
│  │   Logs       │ Subgraph   │ Off-chain Storage      │   │
│  └──────────────┴────────────┴─────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 📊 Entity Relationship Diagram

```
┌─────────────────┐
│     Events      │
├─────────────────┤
│ eventId (PK)    │◄──────────┐
│ organizer       │           │
│ name            │           │
│ location        │           │ 1..N
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
                        └─────────────────┘
                              ◄┤
                              │ 1..1
                        ┌─────────────────┐
                        │  ResaleListings │
                        ├─────────────────┤
                        │ ticketId (FK)   │
                        │ seller          │
                        │ price           │
                        │ isActive        │
                        │ listingDate     │
                        └─────────────────┘
```

## 🔐 Security Architecture

### Access Control Model

```
                ┌─────────────────────────┐
                │   DEFAULT_ADMIN_ROLE    │
                │  (Contract Deployer)    │
                └────────┬────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌─────────────────┐ ┌─────────────┐
│  ADMIN_ROLE  │ │ EVENT_CREATOR   │ │ USER_ROLE   │
│              │ │ (Organizers)    │ │ (Default)   │
├──────────────┤ ├─────────────────┤ ├─────────────┤
│ Verify items │ │ Create events   │ │ Buy tickets │
│ Mark used    │ │ Issue tickets   │ │ Transfer    │
│ Withdraw $   │ │ Cancel events   │ │ Resell      │
│ Set fees     │ └─────────────────┘ └─────────────┘
└──────────────┘
```

### Security Mechanisms

1. **Reentrancy Guards**: `ReentrancyGuard` on payment functions
2. **Access Control**: Role-based permission system
3. **Input Validation**: All parameters validated
4. **Safe Transfers**: Using safe NFT transfer methods
5. **Event Logging**: Complete audit trail via events

## 💰 Tokenomics & Economics

### Fee Structure

```
Primary Sale (Organizer Price):
  Ticket: 0.1 ETH
  ├─ Directly to Organizer: 0.1 ETH
  └─ Platform Fee: 0 ETH

Secondary Sale (Resale):
  Listing Price: 0.15 ETH
  ├─ Seller Receives: 0.147 ETH (98%)
  └─ Platform Fee: 0.003 ETH (2%)
```

### Revenue Model

- **Primary**: 0% (Direct to organizers)
- **Secondary**: 2% (Adjustable up to 10%)
- **Treasury**: Receives all platform fees

## 🔄 Workflow Diagrams

### Event Creation Flow

```
Organizer
   │
   ├─1. Verify (Admin)
   │   └─ KYC completed
   │
   ├─2. Create Event
   │   └─ Event stored with metadata
   │
   ├─3. Issue Tickets
   │   ├─ Mint NFTs
   │   ├─ Assign seats
   │   └─ Store metadata URIs
   │
   └─4. Event Active
       └─ Ready for distribution
```

### Ticket Lifecycle

```
Created
   │
   ├─ Verified (Admin scan at entry)
   │   │
   │   └─ Used (Scanned/redeemed)
   │       │
   │       └─ Final State (Cannot transfer)
   │
   └─ Listed for Resale
       │
       ├─ Sold (Ownership transfer)
       │   │
       │   └─ Returns to "Created" state
       │
       └─ Delisted (No longer for sale)
```

### Resale Transaction Flow

```
Seller lists ticket
   │
   ├─ set isForResale = true
   ├─ set resalePrice
   └─ create ResaleListing
       │
Buyer purchases
   │
   ├─ sends payment (exact amount)
   │
   ├─ Platform collects 2% fee
   │   └─ added to platformBalance
   │
   ├─ Seller receives 98% of price
   │   └─ via secure transfer
   │
   └─ Ticket transferred to buyer
       ├─ currentHolder = buyer
       ├─ isForResale = false
       └─ resalePrice = 0
```

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
