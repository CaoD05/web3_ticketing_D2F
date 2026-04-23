import { useEffect, useState } from "react";
import api, { clearAuthSession, getAuthSession, updateAuthUser } from "../lib/api";

export default function WalletConnectPrompt() {
  const [session, setSession] = useState(() => getAuthSession());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(getAuthSession());
  }, []);

  if (!session?.user || session.user.walletAddress) {
    return null;
  }

  const connectWallet = async () => {
    setError("");

    if (!window.ethereum) {
      setError("MetaMask is not available in this browser.");
      return;
    }

    setConnecting(true);

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts?.[0];

      if (!walletAddress) {
        throw new Error("No wallet address returned by MetaMask.");
      }

      const response = await api.post("/auth/connect-wallet", { walletAddress });
      const updatedUser = response.data.user;

      updateAuthUser(updatedUser);
      setSession({ ...session, user: updatedUser });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Failed to connect MetaMask.");
    } finally {
      setConnecting(false);
    }
  };

  const logout = () => {
    clearAuthSession();
    setSession(null);
    window.location.href = "/";
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#121212] p-6 text-white shadow-2xl shadow-black/50">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">Wallet setup</p>
        <h2 className="mt-3 text-2xl font-black">Connect MetaMask to continue</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Your account is ready. Connect a MetaMask wallet now to enable ticket ownership, purchases, and transfers.
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          Signed in as <span className="font-semibold text-white">{session.user.email}</span>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={connectWallet}
            disabled={connecting}
            className="rounded-2xl bg-yellow-400 px-5 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {connecting ? "Connecting..." : "Connect MetaMask"}
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={connecting}
            className="rounded-2xl border border-white/20 bg-transparent px-5 py-3 font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Log out
          </button>
          <div className="flex items-center text-sm text-white/55">
            No manual address. We read the address from MetaMask directly.
          </div>
        </div>
      </div>
    </div>
  );
}