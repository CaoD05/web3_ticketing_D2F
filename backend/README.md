# 🖥️ Web3 Ticketing — Backend Service

The backend service is a robust Express.js API that bridges the gap between the blockchain and the frontend. It manages user data, off-chain event metadata, and provides real-time updates via Socket.io.

## 🚀 Key Features

- **Prisma ORM:** Type-safe database access with PostgreSQL.
- **JWT Auth:** Secure authentication for users and admins.
- **Google OAuth:** Seamless sign-in integration.
- **Socket.io:** Real-time event notifications for ticket purchases.
- **Web3 Integration:** Direct interaction with the `Ticketing` smart contract via Ethers.js.
- **File Uploads:** Secure image uploads for events via Multer and Supabase storage.

## 📂 Directory Structure

```text
backend/
├── abis/               # Smart contract ABIs
├── config/             # Database and external service configurations
├── controllers/        # Business logic for API endpoints
├── docs/               # Additional API documentation and Postman collections
├── middleware/         # Auth, validation, and rate-limiting middleware
├── prisma/             # Database schema and migrations
├── routes/             # Express route definitions
├── scripts/            # Utility scripts for database seeding and probing
├── services/           # Reusable services (Email, Web3, etc.)
├── utils/              # Helper functions and constants
├── server.js           # Main entry point
└── .env.example        # Template for environment variables
```

## 🛠️ Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment:**
    Create a `.env` file based on `.env.example`.
3.  **Generate Prisma Client:**
    ```bash
    npx prisma generate
    ```
4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## 🧪 Testing

The backend includes a comprehensive health check and a QA automation bot.

- **Health Check:** `GET /api/health`
- **QA Bot:** Run `node ../test-system.js` from the project root.

## 📘 API Documentation

For a detailed list of all available endpoints and request/response formats, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## 🛡️ Security Notes

- Always keep your `JWT_SECRET` and private keys secure and out of version control.
- Rate limiting is applied to sensitive endpoints like `/api/orders` and `/api/upload`.
- All user input is sanitized and validated.
