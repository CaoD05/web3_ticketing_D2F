# 🎨 Web3 Ticketing — Frontend Application

A modern, responsive React application for the Web3 Ticketing Platform. This frontend allows users to browse events, purchase NFT tickets, and manage their ticket portfolio.

## 🚀 Key Features

- **Wallet Integration:** Seamless connection with MetaMask and other Web3 wallets.
- **Dynamic Event Discovery:** Browse and search for events with rich metadata.
- **NFT Ownership View:** View and verify your owned tickets in a dedicated "My Tickets" section.
- **Responsive Design:** Built with Tailwind CSS for a great experience on any device.
- **Interactive Auth:** Hybrid login flow supporting Email/Password, Google, and Wallet connections.
- **Real-time UX:** Instant UI updates via Socket.io when tickets are purchased.

## 📂 Directory Structure

```text
frontend/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components (Navbar, Hero, Cards)
│   ├── context/        # React Context providers (Auth, Wallet)
│   ├── layouts/        # Page layout wrappers (Main, Auth)
│   ├── lib/            # Utility libraries and API helpers
│   ├── pages/          # Full page components
│   ├── App.js          # Main application component and routing
│   └── index.js        # Entry point
├── tailwind.config.js  # Tailwind CSS configuration
└── .env.example        # Template for environment variables
```

## 🛠️ Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment:**
    Copy `.env.example` to `.env` and set the following:
    - `REACT_APP_API_BASE_URL`: The URL of your backend (default: `http://localhost:5000/api`).
    - `REACT_APP_GOOGLE_CLIENT_ID`: Your Google OAuth client ID.
3.  **Start Development Server:**
    ```bash
    npm start
    ```
    The application will be available at `http://localhost:3000`.

## 🎨 Styling

This project uses **Tailwind CSS** for styling. You can customize the theme in `tailwind.config.js`.

## 📦 Build for Production

To create an optimized production build:

```bash
npm run build
```

The output will be in the `build/` folder.

## 🛡️ Authentication Flow

1.  **Identity Auth:** Users can log in via Email or Google.
2.  **Wallet Link:** Once logged in, users are prompted to connect their MetaMask wallet to interact with blockchain features.
3.  **Persistence:** JWT tokens are stored securely to maintain session state.

---

For any issues or suggestions, please refer to the project's root [README.md](../README.md).
