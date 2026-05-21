import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const menuItems = [
        { name: "Tổng quan", path: "/admin", icon: "📊" },
        { name: "Quản lý Sự kiện", path: "/admin/events", icon: "🎟️" },
        { name: "Quản lý Tài khoản", path: "/admin/users", icon: "👥" },
    ];

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-zinc-900 text-white flex flex-col shadow-2xl">
                {/* Logo Section */}
                <div className="p-8 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center font-black text-black text-xl">U</div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter text-yellow-400">ADMIN</h1>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">Command Center</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-6 space-y-2 mt-4">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                                    isActive 
                                    ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 translate-x-2" 
                                    : "text-white/50 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="p-6 border-t border-white/5 space-y-3">
                    {/* Back to Home Button */}
                    <Link 
                        to="/" 
                        className="flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all group"
                    >
                        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
                        Về trang chủ
                    </Link>

                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-sm text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <span className="text-xl">🚪</span>
                        Đăng xuất
                    </button>

                    {/* Admin User Info */}
                    <div className="mt-4 px-6 py-4 bg-white/5 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-black">
                            {user?.fullName?.[0].toUpperCase() || "A"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold truncate">{user?.fullName || "Administrator"}</p>
                            <p className="text-[10px] text-white/30 font-mono truncate">{user?.walletAddress?.slice(0, 10)}...</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="p-12">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
