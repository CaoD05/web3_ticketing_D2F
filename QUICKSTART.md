# 🚀 Comprehensive Setup Guide

Follow these steps to set up the entire Web3 Ticketing Platform from scratch.

## 📋 Prerequisites
- **Node.js 20+**
- **npm** or **yarn**
- **Git**
- **PostgreSQL** (Local, Supabase, or Aiven)
- **Pinata Account** (Free tier is sufficient)
- **MetaMask** browser extension

---

## 🛠️ Step 1: Smart Contract Deployment

1.  **Install Dependencies**:
    ```bash
    cd smart-contract
    npm install
    ```
2.  **Configure Environment**:
    Create a `.env` file from `.env.example`. You **must** provide:
    - `PRIVATE_KEY`: Your wallet's private key.
3.  **Compile & Deploy**:
    ```bash
    npx hardhat compile
    npx hardhat run scripts/deploy-unencrypted.js --network sapphireTestnet
    ```
    **SAVE the output address** (e.g., `0x6F0e...`). You will need this for the backend and frontend.

---

## 🖥️ Step 2: Backend Setup

1.  **Install Dependencies**:
    ```bash
    cd ../backend
    npm install
    ```
2.  **Configure Environment**:
    Create a `.env` file. Critical variables:
    - `DATABASE_URL`: Your PostgreSQL connection string.
    - `CONTRACT_ADDRESS`: The address from Step 1.
    - `PINATA_JWT`: Your Pinata API Key (JWT).
    - `JWT_SECRET`: A long random string for auth.
    - `RPC_URL`: `https://testnet.sapphire.oasis.io`
3.  **Initialize Database**:
    ```bash
    npx prisma db push
    npx prisma generate
    ```
4.  **Launch**:
    ```bash
    npm run dev
    ```

---

## 🎨 Step 3: Frontend Setup

1.  **Install Dependencies**:
    ```bash
    cd ../frontend
    npm install
    ```
2.  **Configure Environment**:
    Create a `.env` file. Essential variables:
    - `REACT_APP_API_BASE_URL`: `http://localhost:5000/api`
    - `REACT_APP_IPFS_GATEWAY`: `https://indigo-brilliant-peafowl-826.mypinata.cloud/ipfs` (Use your own dedicated gateway if available).
    - `REACT_APP_GOOGLE_CLIENT_ID`: (Optional) For Google login.
3.  **Launch**:
    ```bash
    npm start
    ```

---

## 🧭 Step 4: First Usage & Roles

### 1. Account Creation
- Register a new account on your site.
- Connect your MetaMask wallet when prompted.

### 2. Granting Roles
By default, you are a `user`. To create events, you need the `organizer` role.
- **In Database**: Change your `Role` column to `organizer` (or `admin` for the portal).
- **Restart Backend**: This ensures the sync service sees your new role.
- **On-Chain**: Run the interaction script to grant roles on the blockchain:
  ```bash
  cd smart-contract
  npx hardhat run scripts/interact-sapphire.js --network sapphireTestnet
  ```

### 3. Create & Buy
- Go to the **Organizer Dashboard** (or Admin Portal).
- Create an event (upload banner and detail images).
- View the event as a regular user and click **"Mua vé ngay"**.

---

## 🛠️ Common Troubleshooting

| Issue | Solution |
|-------|----------|
| **Numeric Overflow** | Ensure your DB schema matches `Decimal(78,0)` for price fields. Run `npx prisma db push`. |
| **Transaction Revert** | Check your wallet role on the dashboard. Ensure the event time is at least 1 hour in the future. |
| **Missing Images** | Verify your `PINATA_JWT` is correct and your dedicated gateway is accessible. |
| **CORS Error** | Ensure the backend is running and the `origin` in `server.js` allows your frontend port. |

---

## 📚 Technical Docs
- [ARCHITECTURE.md](ARCHITECTURE.md) - System-wide logic and data flow.
- [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) - API endpoints.
- [SAPPHIRE_VERIFICATION.md](SAPPHIRE_VERIFICATION.md) - On-chain verification guide.
