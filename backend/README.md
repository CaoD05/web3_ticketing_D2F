# Backend Run Guide

This guide explains how to run the backend service in this project.

## 1. Prerequisites

- Node.js 20+ recommended
- npm
- A PostgreSQL database (Aiven is supported)

## 2. Go To Backend Folder

Run all backend commands inside `backend` (not project root):

```powershell
cd D:\VSC\Repo\Dapps\web3_ticketing_D2F\backend
```

## 3. Install Dependencies

```powershell
npm install
```

## 4. Configure Environment Variables

Create/update `.env` in `backend`:

```dotenv
PORT=5000
JWT_SECRET=replace_with_long_random_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# Prisma DB connection (Aiven PostgreSQL)
# If your password has special characters, URL-encode it.
DATABASE_URL=postgresql://avnadmin:YOUR_PASSWORD@YOUR_HOST.aivencloud.com:YOUR_PORT/defaultdb?sslmode=require

# Web3
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
CONTRACT_ADDRESS=0xYourTicketingContractAddress
PRIVATE_KEY=0xYourPrivateKeyForWriteTransactions
ADMIN_PRIVATE_KEY=0xYourAdminPrivateKey
```

Notes:
- `DATABASE_URL` is required by Prisma.
- Keep `sslmode=require` for Aiven.
- `JWT_SECRET` must be a long random string.

## 5. Generate Prisma Client

```powershell
npx prisma generate
```

If this fails, verify you are still in the `backend` folder.

## 6. Run Backend

Development/start mode are currently the same command:

```powershell
npm run dev
```

You should see logs similar to:
- `Server listening on http://localhost:5000`
- `Socket.io ...`

## 7. Quick Health Checks

Backend health:

```powershell
curl http://localhost:5000/health
```

Expected success response:
- `ok: true`
- `db: connected`

Web3 read check:

```powershell
curl http://localhost:5000/web3/info
```

## 8. Common Issues

### Error: `@prisma/client did not initialize yet`
Cause:
- Prisma client not generated, or command run outside `backend`.

Fix:
```powershell
cd D:\VSC\Repo\Dapps\web3_ticketing_D2F\backend
npx prisma generate
npm run dev
```

### Database connection error
Check:
- `DATABASE_URL` format is valid.
- Host/port/user/password are correct.
- Aiven database is reachable.
- `sslmode=require` is present.

### Invalid JWT behavior
Check:
- `JWT_SECRET` exists and is not empty.
- Restart backend after changing `.env`.

### Google sign-in does not appear
Check:
- `GOOGLE_CLIENT_ID` is set in `backend/.env`.
- `REACT_APP_GOOGLE_CLIENT_ID` is set in the frontend environment.
- The Google OAuth client allows the current local origin.

## 9. Auth Flow

- `POST /api/auth/register` creates a normal email/password account.
- `POST /api/auth/login` signs in with email/password.
- `POST /api/auth/google` accepts a Google ID token and creates or logs in the account.
- `POST /api/auth/connect-wallet` links MetaMask after login.
- The UI prompts for MetaMask only after authentication.

## 10. Available Scripts

From `backend/package.json`:

- `npm run start` -> `node server.js`
- `npm run dev` -> `node server.js`

## 11. Security Reminder

- Never commit real secrets in `.env`.
- Rotate database password/private keys immediately if exposed.
