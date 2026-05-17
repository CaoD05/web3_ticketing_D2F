# ⛓️ Web3 Ticketing — Smart Contracts

The core of the Web3 Ticketing Platform, managing event creation, NFT ticket minting, and ownership on the blockchain.

## 🚀 Key Features

- **ERC-721 NFT Tickets:** Standard-compliant non-fungible tokens representing unique tickets.
- **RBAC (Role-Based Access Control):** Granular permissions for Admins and Organizers using OpenZeppelin's `AccessControl`.
- **Event Management:** On-chain storage for event details, pricing, and ticket capacity.
- **Security:** Built-in protection against reentrancy and unauthorized access.
- **Flexible Deployment:** Supports Oasis Sapphire Testnet and local Hardhat networks.

## 📂 Directory Structure

```text
smart-contract/
├── contracts/          # Solidity source code
│   └── Ticketing.sol   # Main ticketing contract
├── scripts/            # Deployment and interaction scripts
├── test/               # Comprehensive test suite
├── hardhat.config.js   # Hardhat configuration
└── .env.example        # Template for environment variables
```

## 🛠️ Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment:**
    Create a `.env` file based on `.env.example`.
3.  **Compile Contracts:**
    ```bash
    npx hardhat compile
    ```
4.  **Run Tests:**
    ```bash
    npx hardhat test
    ```

## 🚀 Deployment

### Local Network
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Oasis Sapphire Testnet
```bash
npx hardhat run scripts/deploy-unencrypted.js --network sapphireTestnet
```

## 🧪 Contract Roles

- **`DEFAULT_ADMIN_ROLE`**: Managed by the contract owner, can grant/revoke all roles.
- **`ADMIN_ROLE`**: Can manage platform settings and verify tickets.
- **`ORGANIZER_ROLE`**: Can create and manage their own events.

## 🔍 Verification

After deploying to a public network, verify the contract via Sourcify (for Sapphire). Refer to [SAPPHIRE_VERIFICATION.md](../SAPPHIRE_VERIFICATION.md).

## 📊 Gas Reference

| Operation | Estimated Gas |
|-----------|---------------|
| `createEvent` | ~150k - 200k |
| `mintTicket` | ~120k - 180k |
| `verifyTicket`| ~30k - 50k |

---

For architectural details, see the root [ARCHITECTURE.md](../ARCHITECTURE.md).
