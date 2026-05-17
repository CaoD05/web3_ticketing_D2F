import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import normalizeEvent from "../lib/normalizeEvent";

function AuthLinks() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) {
        return (
            <>
                <Link to="/login" className="hover:text-yellow-400 font-bold transition">Đăng nhập</Link>
                <Link to="/register" className="bg-yellow-400 text-black px-4 py-2 rounded-full font-bold hover:bg-yellow-300 transition">Đăng ký</Link>
            </>
        );
    }

    const wallet = user.walletAddress;
    const walletBadge = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Chưa kết nối ví";

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10 transition"
            >
                <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate max-w-[100px]">{user.fullName || user.email}</span>
                    <span className={wallet ? "text-yellow-400 font-mono" : "text-red-400 italic"}>{walletBadge}</span>
                </div>
                <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl py-2 z-[60] overflow-hidden">
                    {user.role !== 'admin' && (
                        <>
                            <Link 
                                to="/profile" 
                                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                                onClick={() => setDropdownOpen(false)}
                            >
                                Tài khoản của tôi
                            </Link>

                            <Link 
                                to="/my-tickets" 
                                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                                onClick={() => setDropdownOpen(false)}
                            >
                                Vé của tôi
                            </Link>
                        </>
                    )}
                    
                    {user.role === 'organizer' && (
                        <Link 
                            to="/organizer" 
                            className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                            onClick={() => setDropdownOpen(false)}
                        >
                            Quản lý sự kiện
                        </Link>
                    )}

                    {user.role === 'admin' && (
                        <Link 
                            to="/admin" 
                            className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                            onClick={() => setDropdownOpen(false)}
                        >
                            Quản trị hệ thống
                        </Link>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setDropdownOpen(false);
                            // Navigate first, then logout
                            navigate("/", { replace: true });
                            setTimeout(() => logout(), 0);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition border-t border-white/5"
                    >
                        Đăng xuất
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Navbar() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);

    // Close search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Instant Search Logic (Debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const res = await api.get("/events");
                    const allEvents = (res.data?.data || []).map(normalizeEvent);
                    const filtered = allEvents.filter(e => 
                        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).slice(0, 5); // Limit to top 5 results
                    setSearchResults(filtered);
                    setShowResults(true);
                } catch (err) {
                    console.error("Instant search error:", err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/events?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm("");
            setShowResults(false);
        }
    };

    return (
        <div className="sticky top-0 z-50 flex items-center justify-between bg-black px-8 py-5 text-white border-b border-white/10 gap-8">
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
                <img src="/logoUTC.png" alt="UTC Logo" className="w-8 h-8 group-hover:scale-110 transition" />
                <span className="text-3xl font-black text-yellow-400 tracking-tighter">
                    U-Ticket
                </span>
            </Link>

            {/* Global Search Bar with Dropdown */}
            <div className="flex-1 max-w-xl relative group" ref={searchRef}>
                <form onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm sự kiện, ca sĩ, địa điểm..."
                        className="w-full bg-white/10 border-none rounded-2xl px-12 py-3 text-sm focus:ring-2 focus:ring-yellow-400 focus:bg-white/20 transition-all placeholder:text-white/30"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => searchTerm.trim().length >= 2 && setShowResults(true)}
                    />
                    <svg 
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-yellow-400 transition" 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </form>

                {/* Search Results Dropdown */}
                {showResults && (
                    <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden">
                        {isSearching ? (
                            <div className="p-8 text-center">
                                <div className="inline-block w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="py-2">
                                {searchResults.map((event) => (
                                    <Link
                                        key={event.id}
                                        to={`/event/${event.id}`}
                                        className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition group"
                                        onClick={() => {
                                            setShowResults(false);
                                            setSearchTerm("");
                                        }}
                                    >
                                        <img 
                                            src={event.detailImage} 
                                            alt="" 
                                            className="w-32 aspect-video rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-300 flex-shrink-0"
                                        />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-white truncate group-hover:text-yellow-400">{event.title}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{event.location} • {event.category}</p>
                                        </div>
                                    </Link>
                                ))}
                                <button 
                                    onClick={handleSearch}
                                    className="w-full py-2.5 text-xs font-black text-center text-gray-400 hover:text-white hover:bg-white/5 border-t border-white/5 uppercase tracking-widest"
                                >
                                    Xem tất cả kết quả cho "{searchTerm}"
                                </button>
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-500">Không tìm thấy kết quả nào phù hợp.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-8 text-sm uppercase tracking-widest flex-shrink-0">
                <Link to="/events" className="hover:text-yellow-400 font-bold transition">Khám phá</Link>
                <AuthLinks />
            </div>
        </div>
    );
}
