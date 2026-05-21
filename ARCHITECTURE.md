# System Architecture & Design

## 1. High-Level Architecture

The Web3 Ticketing System is a hybrid DApp built on the **Oasis Sapphire** network. It utilizes a "Blockchain-as-Source-of-Truth" model, where the off-chain database acts as a high-performance cache and enrichment layer.

```text
┌───────────────────────────┐      ┌───────────────────────────┐
│     Frontend Portal       │      │      Admin Portal         │
│ (React - Public & Org)    │      │  (Independent Sidebar UI) │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
              └──────────────┬───────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │      Express.js Backend      │
              │   (Prisma / PostgreSQL)      │
              └──────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐    ┌───────▼───────┐    ┌───────▼───────┐
│ Smart Contract│    │  IPFS/Pinata  │    │ Cloud Storage │
│ (Ticketing)   │    │  (Metadata)   │    │  (Supabase)   │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 2. Core Governance & Roles

The system implements strict **Role-Based Access Control (RBAC)** across three layers: Smart Contract, Backend Middleware, and Frontend UI.

| Role | Access Level | Primary Responsibility |
| :--- | :--- | :--- |
| **Admin** | **System Portal** | Platform oversight, role management, fee governance, global moderation. |
| **Organizer**| **Org Dashboard** | Event creation, inventory management, bulk airdrops. |
| **User** | **Public Site** | Event discovery, primary purchase, voluntary 80% refunds, self check-in. |

---

## 3. Data Synchronization Logic

The platform follows a **"Listener-First"** synchronization strategy to prevent race conditions and ensure data integrity.

### Event Creation Flow:
1. **IPFS Phase**: Organizer uploads media to backend; backend pins to Pinata and returns a Metadata CID.
2. **Blockchain Phase**: Organizer sends a `createEvent` transaction with the CID.
3. **Synchronization Phase**: 
   - The **Backend Web3 Listener** detects the on-chain event.
   - It automatically fetches the JSON from IPFS.
   - It "Hydrates" the database with the event details (Location, Date, Images).
   - It creates a default "Standard" ticket tier automatically.

### Ticket Purchase Flow:
1. **Intent**: Frontend creates a `pending` order record in the DB.
2. **Payment**: User completes the on-chain transaction.
3. **Issuance**: Backend Listener detects `TicketPurchased`, confirms the order, and issues the database ticket record.

---

## 4. Privacy & Confidentiality (Sapphire)

By deploying on **Oasis Sapphire**, the platform provides:
- **Encrypted State**: Ticket details (usage, resale status) are private on-chain.
- **Mempool Privacy**: Prevents scalper bots from observing and front-running ticket purchases.
- **Authorized Getters**: Only the ticket owner or a designated Admin can read sensitive NFT metadata on-chain.

---

## 5. Scalability & Resilience
- **Idempotency**: All database sync actions use transaction hashes as unique keys to prevent duplicates.
- **Numeric Precision**: Database uses `Decimal(78,0)` to handle high-precision blockchain Wei values without overflow.
- **IPFS Fallbacks**: The frontend utilizes multiple IPFS gateways (Dedicated Pinata + Public Fallbacks) to ensure assets load even during gateway downtime.
