# U-Ticket: Confidential Web3 Ticketing

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Network: Oasis Sapphire](https://img.shields.io/badge/Network-Oasis_Sapphire-blue.svg)
![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2d3748.svg)

U-Ticket is a next-generation decentralized ticketing platform built on the **Oasis Sapphire** network. By leveraging confidential smart contracts, U-Ticket provides a private, secure, and scalper-proof environment for event management and ticket issuance.

## The Confidential Advantage

Traditional NFT tickets are public; anyone can see who attends which event. U-Ticket changes this:
- **Private Attendance:** Your ticket ownership and "Used" status are encrypted on-chain.
- **Bot Protection:** Confidential transactions hide purchase data from bots, preventing mempool sniffing and front-running.
- **Secure Validation:** On-chain encryption ensures only the true owner can perform a "Self Check-In" at the event.

---

## Key Features

### 🏢 For Administrators (Admin Portal)
- **Global Oversight:** A dedicated, sidebar-driven portal to manage the entire platform.
- **Role Governance:** Instantly promote users to Organizers or suspend malicious accounts.
- **Financial Analytics:** Real-time tracking of total platform revenue and ticket volume in **ROSE**.
- **Content Moderation:** Toggle visibility or feature specific events globally.

### For Organizers (Organizer Dashboard)
- **Seamless Creation:** Create events with dual-image (Banner/Detail) support and automatic IPFS pinning.
- **Bulk Airdrops:** Distribution made easy—paste a list of wallets to send free sponsor tickets instantly.
- **Real-time Sync:** A robust backend listener that ensures your dashboard matches the blockchain state perfectly.

### For Attendees (User Experience)
- **NFT Tickets:** verifiable ownership with high-quality metadata and `ipfs://` standard visuals.
- **Voluntary Refunds:** Change of mind? Return your ticket for an **80% instant refund** before the event starts.
- **Zero-Friction Check-In:** No QR scanners needed. Confirm your entry with a single tap on your phone.

---

## Technical Stack

- **Blockchain:** Oasis Sapphire (Confidential EVM)
- **Smart Contracts:** Solidity 0.8.19 + OpenZeppelin (ERC-721 URI Storage, RBAC)
- **Frontend:** React 19 + Tailwind CSS + Ethers.js v6
- **Backend:** Node.js (Express) + Prisma ORM
- **Database:** PostgreSQL (Optimized for 78-digit Wei precision)
- **Storage:** IPFS (via Pinata)

---

## Project Structure

```text
.
├── backend/            # Express API, Prisma schema, and Web3 Sync Service
├── frontend/           # React application & Independent Admin Portal
├── smart-contract/     # Hardhat environment, Solidity contracts, and Tests
├── ARCHITECTURE.md     # Detailed system design and data models
├── QUICKSTART.md       # Comprehensive installation and setup guide
└── SAPPHIRE_VERIFICATION.md # Guide for Oasis Sapphire source verification
```

---

## 🚀 Installation & Setup

Setting up U-Ticket is streamlined across three main steps:

1.  **Smart Contracts**:
    ```bash
    cd smart-contract && npm install
    npx hardhat run scripts/deploy-unencrypted.js --network sapphireTestnet
    ```
2.  **Backend API**:
    ```bash
    cd ../backend && npm install
    npx prisma db push
    npm run dev
    ```
3.  **Frontend UI**:
    ```bash
    cd ../frontend && npm install
    npm start
    ```

> **Detailed Instructions**: For a full environment variable checklist and role setup guide, please refer to the **[QUICKSTART.md](QUICKSTART.md)**.

---

## 🛡️ Security & Integrity

- **Idempotent Sync:** Every database update is tied to a transaction hash to prevent duplicates.
- **High-Precision Math:** Database fields are calibrated to `Decimal(78,0)` to handle blockchain-native Wei values.
- **Hybrid Auth:** Secure JWT-based sessions combined with cryptographically verified wallet connections.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
