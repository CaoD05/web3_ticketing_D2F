import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cancelEventOnChain, airdropTicketsOnChain } from "../lib/web3";
import normalizeEvent from "../lib/normalizeEvent";
import { ethers } from "ethers";

export default function AdminDashboard() {
    const { user: currentUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Tab State: 'overview' | 'events' | 'accounts'
    const activeTab = 
        location.pathname === '/admin' ? 'overview' : 
        location.pathname.includes('/users') ? 'accounts' : 'events';

    // Data State
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [globalStats, setGlobalStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Airdrop State
    const [showAirdropModal, setShowAirdropModal] = useState(false);
    const [airdropEventId, setAirdropEventId] = useState(null);
    const [airdropAddresses, setAirdropAddresses] = useState("");
    const [airdropping, setAirdriving] = useState(false);

    const fetchGlobalStats = useCallback(async () => {
        try {
            const res = await api.get("/dashboard/stats");
            if (res.data?.ok) setGlobalStats(res.data.data);
        } catch (err) {
            console.error("Fetch stats error:", err);
        }
    }, []);

    const fetchAllEvents = useCallback(async () => {
        try {
            const res = await api.get("/events");
            if (res.data?.ok) {
                const allNormalized = (res.data?.data || []).map(normalizeEvent);
                setEvents(allNormalized);
            }
        } catch (err) {
            console.error("Fetch events error:", err);
        }
    }, []);

    const fetchAllUsers = useCallback(async () => {
        try {
            const res = await api.get("/users");
            if (res.data?.ok) {
                setUsers(res.data.data);
            }
        } catch (err) {
            console.error("Fetch users error:", err);
        }
    }, []);

    const refreshData = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchGlobalStats(), fetchAllEvents(), fetchAllUsers()]);
        setLoading(false);
    }, [fetchGlobalStats, fetchAllEvents, fetchAllUsers]);

    useEffect(() => {
        if (authLoading) return;
        if (!currentUser || currentUser.role !== 'admin') {
            navigate("/");
            return;
        }
        refreshData();
    }, [currentUser, authLoading, navigate, refreshData]);

    const handleToggleVisibility = async (eventId, currentHidden) => {
        try {
            await api.put(`/events/${eventId}`, { IsHidden: !currentHidden });
            fetchAllEvents();
        } catch (err) { alert("Lỗi hiển thị"); }
    };

    const handleToggleFeatured = async (eventId, currentFeatured) => {
        try {
            await api.put(`/events/${eventId}`, { IsFeatured: !currentFeatured });
            fetchAllEvents();
        } catch (err) { alert("Lỗi nổi bật"); }
    };

    const handleCancelEvent = async (eventId, contractEventId) => {
        if (!window.confirm("Hủy sự kiện?")) return;
        try {
            if (contractEventId !== null) await cancelEventOnChain(contractEventId);
            await api.patch(`/events/${eventId}/cancel`);
            fetchAllEvents();
        } catch (err) { alert("Lỗi: " + err.message); }
    };

    const handleUpdateRole = async (userId, newRole) => {
        if (userId === currentUser.userId) return;
        try {
            await api.put(`/users/${userId}/role`, { Role: newRole });
            fetchAllUsers();
        } catch (err) { alert("Lỗi role"); }
    };

    const handleToggleSuspension = async (userId, currentSuspended) => {
        if (userId === currentUser.userId) return;
        try {
            await api.put(`/users/${userId}/status`, { IsSuspended: !currentSuspended });
            fetchAllUsers();
        } catch (err) { alert("Lỗi status"); }
    };

    const handleAirdrop = async () => {
        const addresses = airdropAddresses.split("\n")
            .map(a => a.trim())
            .filter(a => a.startsWith("0x") && a.length === 42);
        
        if (addresses.length === 0) {
            alert("Vui lòng nhập ít nhất một địa chỉ ví hợp lệ (0x...).");
            return;
        }

        setAirdriving(true);
        try {
            await airdropTicketsOnChain(airdropEventId, addresses);
            alert(`Đã airdrop thành công cho ${addresses.length} ví!`);
            setShowAirdropModal(false);
            setAirdropAddresses("");
            refreshData();
        } catch (err) {
            alert("Lỗi Airdrop: " + err.message);
        } finally {
            setAirdriving(false);
        }
    };

    if (authLoading || loading) {
        return <div className="p-20 text-center font-bold text-gray-400 uppercase tracking-widest animate-pulse">Đang tải...</div>;
    }

    const formattedRevenue = globalStats?.totalRevenue 
        ? parseFloat(ethers.formatEther(globalStats.totalRevenue.toString())).toFixed(2)
        : "0.00";

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            {/* Universal Stats Header (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Doanh thu", val: `${formattedRevenue} ROSE`, color: "text-red-600" },
                    { label: "Vé đã bán", val: globalStats?.totalTickets || 0, color: "text-gray-900" },
                    { label: "Thành viên", val: globalStats?.totalUsers || 0, color: "text-gray-900" },
                    { label: "Sự kiện", val: globalStats?.totalEvents || 0, color: "text-green-600" }
                ].map((s, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 transition hover:border-yellow-400">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className={`text-3xl font-black ${s.color} italic`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Content Context Title */}
            <div className="pt-4 border-t border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                    {activeTab === 'overview' ? "Thống kê chi tiết" : 
                     activeTab === 'accounts' ? "Quản lý Người dùng" : "Quản lý Sự kiện"}
                </h2>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-8 flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                            Trạng thái Hệ thống
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-bold">Sự kiện đang diễn ra</span>
                                <span className="font-black text-green-600">{globalStats?.activeEvents || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-bold">Lượt Check-in</span>
                                <span className="font-black">{globalStats?.totalCheckins || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-8 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Cơ cấu Tài khoản
                        </h3>
                        <div className="space-y-4">
                            {['admin', 'organizer', 'user'].map(role => (
                                <div key={role} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">{role}</span>
                                    <span className="font-bold">{globalStats?.usersByRole?.[role] || 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'events' && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {events.map(event => (
                        <div key={event.id} className="p-8 flex flex-col md:flex-row items-center gap-8 hover:bg-gray-50 transition">
                            <img src={event.bannerImage} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-lg font-bold">{event.title}</h3>
                                <p className="text-gray-500 text-xs mt-1">{event.location} • {formatDate(event.date)}</p>
                                <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                                    {event.IsFeatured && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">⭐ Nổi bật</span>}
                                    {event.IsHidden && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Đang ẩn</span>}
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">{event.TicketsSold}/{event.TotalTickets} vé</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3">
                                <button 
                                    onClick={() => { setAirdropEventId(event.contractEventId); setShowAirdropModal(true); }}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100"
                                >
                                    Airdrop
                                </button>
                                <button onClick={() => handleToggleFeatured(event.id, event.IsFeatured)} className="px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase">{event.IsFeatured ? "Gỡ nổi bật" : "Nổi bật"}</button>
                                <button onClick={() => handleToggleVisibility(event.id, event.IsHidden)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${event.IsHidden ? "bg-green-100 text-green-700" : "bg-gray-50 text-gray-500"}`}>{event.IsHidden ? "Hiện" : "Ẩn"}</button>
                                {event.Status === 'Active' && <button onClick={() => handleCancelEvent(event.id, event.contractEventId)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase">Hủy</button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'accounts' && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">Người dùng</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 text-center">Vai trò</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map(u => (
                                <tr key={u.UserID} className={u.IsSuspended ? 'bg-red-50/20 opacity-70' : ''}>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center font-black text-xs text-black">{(u.FullName || "?")[0]}</div>
                                            <div>
                                                <p className="text-sm font-bold">{u.FullName}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{u.WalletAddress || u.Email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.Role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{u.Role}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <select value={u.Role} disabled={u.UserID === currentUser.userId} onChange={(e) => handleUpdateRole(u.UserID, e.target.value)} className="bg-gray-50 text-[10px] font-bold border-none rounded-lg p-1">
                                                <option value="user">User</option>
                                                <option value="organizer">Organizer</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <button onClick={() => handleToggleSuspension(u.UserID, u.IsSuspended)} disabled={u.UserID === currentUser.userId} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${u.IsSuspended ? 'text-green-600' : 'text-red-600'}`}>
                                                {u.IsSuspended ? 'Unsuspend' : 'Suspend'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Airdrop Modal */}
            {showAirdropModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-2 text-gray-900">🎁 Bulk Airdrop</h2>
                        <textarea 
                            rows="8"
                            className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-xs font-mono focus:ring-2 focus:ring-blue-500 mt-4"
                            placeholder="0x123...&#10;0x456..."
                            value={airdropAddresses}
                            onChange={(e) => setAirdropAddresses(e.target.value)}
                        />
                        <div className="mt-8 flex gap-4">
                            <button onClick={() => setShowAirdropModal(false)} className="flex-1 py-4 text-gray-400 font-bold">Hủy</button>
                            <button onClick={handleAirdrop} disabled={airdropping} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase">Gửi ngay</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDate(value) {
    if (!value) return "Chưa xác định";
    try {
        const date = new Date(value);
        return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
    } catch (e) { return value; }
}
