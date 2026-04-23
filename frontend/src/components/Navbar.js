import { Link } from "react-router-dom";
import { clearAuthSession, getAuthSession } from "../lib/api";

function AuthLinks() {
    const session = getAuthSession();

    if (!session?.user) {
        return (
            <>
                <Link to="/auth/login" className="hover:text-yellow-400">Đăng nhập</Link>
                <Link to="/auth/register" className="hover:text-yellow-400">Đăng ký</Link>
            </>
        );
    }

    const walletBadge = session.user.walletAddress ? `${session.user.walletAddress.slice(0, 6)}...${session.user.walletAddress.slice(-4)}` : "MetaMask pending";

    return (
        <>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 md:flex">
                <span>{session.user.email}</span>
                <span className="text-yellow-400">•</span>
                <span>{walletBadge}</span>
            </div>
            <button
                type="button"
                onClick={() => {
                    clearAuthSession();
                    window.location.href = "/";
                }}
                className="hover:text-yellow-400"
            >
                Đăng xuất
            </button>
        </>
    );
}

export default function Navbar() {
    return (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-black px-8 py-4 text-white">
            <Link to="/" className="text-2xl font-bold text-yellow-400">
                U-Ticket
            </Link>

            <div className="flex gap-6 items-center">
                <Link to="/events" className="hover:text-yellow-400">Sự kiện</Link>
                <AuthLinks />
            </div>
        </div>
    );
}