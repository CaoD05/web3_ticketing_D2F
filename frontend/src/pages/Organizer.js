import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { createEventOnChain, getContract, cancelEventOnChain } from "../lib/web3";
import { ethers } from "ethers";
import normalizeEvent from "../lib/normalizeEvent";

export default function Organizer() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    // Core State
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isOrganizerOnChain, setIsOrganizerOnChain] = useState(null);

    // Form states
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [priceEth, setPriceEth] = useState("");
    const [totalTickets, setTotalTickets] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [location, setLocation] = useState("");
    const [eventType, setEventType] = useState("Other");
    const [bannerFile, setBannerFile] = useState(null);
    const [detailFile, setDetailFile] = useState(null);
    
    // Status State
    const [creating, setCreating] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);
    const [error, setError] = useState("");

    const fetchMyEvents = useCallback(async () => {
        try {
            const res = await api.get("/events");
            if (res.data?.ok) {
                const allNormalized = (res.data?.data || []).map(normalizeEvent);
                const myEvents = allNormalized.filter(e => e.CreatedBy === user?.userId);
                setEvents(myEvents);
            }
        } catch (err) {
            console.error("Fetch events error:", err);
            setError("Không thể tải danh sách sự kiện từ server.");
        } finally {
            setLoading(false);
        }
    }, [user?.userId]);

    const checkOrganizerRole = useCallback(async () => {
        if (!user?.walletAddress) return;
        try {
            const contract = await getContract();
            const ORGANIZER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORGANIZER_ROLE"));
            const hasRole = await contract.hasRole(ORGANIZER_ROLE, user.walletAddress);
            setIsOrganizerOnChain(hasRole);
            console.log(`[Web3] Role Check: ${user.walletAddress} is Organizer? ${hasRole}`);
        } catch (err) {
            console.error("Role check error:", err);
            setIsOrganizerOnChain(false);
        }
    }, [user?.walletAddress]);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user || user.role !== 'organizer') {
            navigate("/");
            return;
        }

        fetchMyEvents();
        
        if (user.walletAddress) {
            checkOrganizerRole();
        }
    }, [user, authLoading, navigate, fetchMyEvents, checkOrganizerRole]);

    const handleToggleVisibility = async (eventId, currentHidden) => {
        try {
            await api.put(`/events/${eventId}`, { IsHidden: !currentHidden });
            fetchMyEvents();
        } catch (err) {
            console.error("Toggle visibility error:", err);
            alert("Không thể thay đổi trạng thái hiển thị");
        }
    };

    const handleCancelEvent = async (eventId, contractEventId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy sự kiện này? Thao tác này sẽ được ghi nhận trên Blockchain.")) return;
        
        try {
            setCancellingId(eventId);
            // 1. Blockchain call if it has a contract ID
            if (contractEventId !== null && contractEventId !== undefined) {
                console.log(`[Web3] Cancelling event ${contractEventId} on-chain...`);
                await cancelEventOnChain(contractEventId);
            }

            // 2. API call to update DB
            await api.patch(`/events/${eventId}/cancel`);
            
            alert("Đã hủy sự kiện thành công!");
            fetchMyEvents();
        } catch (err) {
            console.error("Cancel event error:", err);
            alert("Lỗi khi hủy sự kiện: " + (err.response?.data?.message || err.message));
        } finally {
            setCancellingId(null);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setError("");
        setCreating(true);

        try {
            if (!user.walletAddress) throw new Error("Vui lòng kết nối ví MetaMask trước!");
            if (!bannerFile) throw new Error("Vui lòng chọn ảnh Banner!");
            
            if (isOrganizerOnChain === false) {
                throw new Error("Ví của bạn chưa được cấp quyền ORGANIZER trên Blockchain.");
            }

            // 1. Upload to IPFS
            const formData = new FormData();
            formData.append("banner", bannerFile);
            if (detailFile) formData.append("detail", detailFile);
            formData.append("name", name);
            formData.append("description", description);
            formData.append("location", location);
            formData.append("date", eventDate);
            formData.append("category", eventType);
            
            const metaRes = await api.post("/events/metadata", formData);
            const { metadataCid } = metaRes.data.data;

            // 2. Blockchain Transaction
            const priceWei = ethers.parseEther(priceEth || "0");
            const startTime = Math.floor(new Date(eventDate).getTime() / 1000);
            
            console.log("[Web3] Sending createEvent tx...");
            const txHash = await createEventOnChain(name, priceWei, totalTickets, startTime, metadataCid);
            console.log("[Web3] Tx successful:", txHash);

            // 3. Save to DB - REMOVED
            // We no longer call api.post("/events") here.
            // The Backend Blockchain Listener will automatically see the 'EventCreated' event
            // and create the database record for us. 
            // This ensures only one source of truth and prevents race conditions.
            
            alert("Sự kiện đã được gửi lên Blockchain thành công! Vui lòng chờ vài giây để hệ thống đồng bộ dữ liệu.");
            
            // 4. Reset form and refresh
            setShowForm(false);
            resetForm();
            
            // Wait a moment for the backend listener to finish before refreshing
            setTimeout(() => {
                fetchMyEvents();
            }, 3000);
        } catch (err) {
            console.error("Create event flow error:", err);
            setError(err.response?.data?.message || err.message || "Lỗi tạo sự kiện");
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setName("");
        setDescription("");
        setPriceEth("");
        setTotalTickets("");
        setEventDate("");
        setLocation("");
        setBannerFile(null);
        setDetailFile(null);
    };

    if (authLoading || loading) {
        return <div className="p-20 text-center font-bold text-gray-500 uppercase tracking-widest">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase">Quản lý</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-500 uppercase text-xs tracking-widest font-bold">Dashboard</p>
                            {isOrganizerOnChain === true && (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-green-200">On-Chain Verified</span>
                            )}
                            {isOrganizerOnChain === false && (
                                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border border-red-200">Missing Role</span>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className="bg-yellow-400 text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-yellow-300 transition"
                    >
                        {showForm ? "Hủy bỏ" : "Tạo sự kiện mới"}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl mb-12 border border-yellow-400/20">
                        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Tên sự kiện</label>
                                    <input required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Mô tả</label>
                                    <textarea required rows="4" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4" value={description} onChange={e => setDescription(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 mb-2">Giá vé (TEST)</label>
                                        <input required type="number" step="0.001" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4" value={priceEth} onChange={e => setPriceEth(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 mb-2">Số lượng</label>
                                        <input required type="number" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4" value={totalTickets} onChange={e => setTotalTickets(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Thời gian</label>
                                    <input required type="datetime-local" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Địa điểm</label>
                                    <input required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4" value={location} onChange={e => setLocation(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Thể loại</label>
                                    <select className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4" value={eventType} onChange={e => setEventType(e.target.value)}>
                                        <option value="Live Music">Live Music</option>
                                        <option value="Fan Meeting">Fan Meeting</option>
                                        <option value="Merchandise">Merchandise</option>
                                        <option value="Stage & Art">Stage & Art</option>
                                        <option value="Sports">Sports</option>
                                        <option value="Conferences & Community">Conferences & Community</option>
                                        <option value="Courses">Courses</option>
                                        <option value="Nightlife">Nightlife</option>
                                        <option value="Livestream">Livestream</option>
                                        <option value="Travel & Tours">Travel & Tours</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Ảnh Banner</label>
                                    <input type="file" accept="image/*" className="w-full text-xs" onChange={e => setBannerFile(e.target.files[0])} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Ảnh Chi tiết (Tùy chọn)</label>
                                    <input type="file" accept="image/*" className="w-full text-xs" onChange={e => setDetailFile(e.target.files[0])} />
                                </div>

                                {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl text-xs font-bold">{error}</div>}

                                <button disabled={creating} className={`w-full py-5 rounded-2xl font-black uppercase shadow-xl transition ${creating ? "bg-gray-300" : "bg-black text-white hover:bg-gray-800"}`}>
                                    {creating ? "Đang xử lý..." : "Xác nhận tạo sự kiện"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-4">
                    {events.length === 0 ? (
                        <div className="bg-white rounded-[2rem] p-20 text-center text-gray-400">Chưa có sự kiện nào.</div>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="bg-white rounded-[2rem] p-6 shadow-sm flex items-center gap-6">
                                <img src={event.bannerImage} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-black">{event.title}</h3>
                                        {event.IsCancelled && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">Đã hủy</span>}
                                        {event.IsHidden && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Đang ẩn</span>}
                                        {event.IsFeatured && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">⭐ Nổi bật</span>}
                                    </div>
                                    <p className="text-gray-500 text-sm">{event.location} • {event.date}</p>
                                    <div className="flex gap-6 mt-2">
                                        <p className="text-sm font-bold text-gray-800">{event.TicketsSold || 0} / {event.TotalTickets} vé đã bán</p>
                                        <p className="text-sm font-bold text-green-600">
                                            Doanh thu: {(Number(event.TicketsSold || 0) * parseFloat(event.priceEth || 0)).toFixed(2)} ROSE
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {!event.IsCancelled && (
                                        <>
                                            <button onClick={() => handleToggleVisibility(event.id, event.IsHidden)} className="px-6 py-2 bg-gray-50 rounded-xl text-xs font-bold">{event.IsHidden ? "Hiện" : "Ẩn"}</button>
                                            <button 
                                                onClick={() => handleCancelEvent(event.id, event.contractEventId)}
                                                disabled={cancellingId === event.id}
                                                className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition disabled:opacity-50"
                                            >
                                                {cancellingId === event.id ? "Đang hủy..." : "Hủy"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
