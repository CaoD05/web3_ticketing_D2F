import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { createEventOnChain } from "../lib/web3";
import { ethers } from "ethers";
import normalizeEvent from "../lib/normalizeEvent";

export default function Admin() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

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
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    const fetchMyEvents = useCallback(async () => {
        try {
            const res = await api.get("/events");
            // Normalize events to handle multi-image and legacy fields
            const allNormalized = (res.data?.data || []).map(normalizeEvent);
            // Filter events created by this user
            const myEvents = allNormalized.filter(e => e.CreatedBy === user?.userId) || [];
            setEvents(myEvents);
        } catch (err) {
            console.error("Fetch events error:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.userId]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || (user.role !== 'admin' && user.role !== 'organizer')) {
            navigate("/");
            return;
        }

        fetchMyEvents();
    }, [user, authLoading, navigate, fetchMyEvents]);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setError("");
        setCreating(true);

        try {
            if (!user.walletAddress) throw new Error("Vui lòng kết nối ví MetaMask trước!");
            if (!bannerFile) throw new Error("Vui lòng chọn ảnh Banner!");

            // 1. Upload images and create JSON metadata on IPFS (via Backend)
            const formData = new FormData();
            formData.append("banner", bannerFile);
            if (detailFile) {
                formData.append("detail", detailFile);
            }
            formData.append("name", name);
            formData.append("description", description);
            formData.append("location", location);
            formData.append("date", eventDate);
            formData.append("category", eventType);
            
            const metaRes = await api.post("/events/metadata", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            const { metadataCid, bannerCid, detailCid } = metaRes.data.data;
            const metaURL = metadataCid; // Use the JSON CID as metaURL on-chain

            // 2. Call Smart Contract
            const priceWei = ethers.parseEther(priceEth);
            const startTime = Math.floor(new Date(eventDate).getTime() / 1000);
            
            const txHash = await createEventOnChain(name, priceWei, totalTickets, startTime, metaURL);
            
            // 3. Save to DB with IPFS CIDs
            await api.post("/events", {
                EventName: name,
                Price: priceWei.toString(),
                TotalTickets: totalTickets,
                EventDate: eventDate,
                Location: location,
                EventType: eventType,
                CreatedBy: user.userId,
                MetaURL: metaURL,           // JSON CID
                BannerURL: bannerCid,        // Image CID for banner
                DetailURL: detailCid         // Image CID for detail (might be same as banner if not provided)
            });
            
            alert(`Sự kiện đã được tạo trên Blockchain và IPFS! TxHash: ${txHash}`);
            
            // 4. Reset form and refresh
            setShowForm(false);
            resetForm();
            fetchMyEvents();
        } catch (err) {
            console.error("Create event error:", err);
            setError(err.response?.data?.message || err.message || "Không thể tạo sự kiện");
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
        setEventType("Other");
        setBannerFile(null);
        setDetailFile(null);
    };

    if (authLoading || loading) {
        return (
            <div className="bg-gray-100 min-h-screen p-10 flex items-center justify-center font-bold">
                Đang tải dữ liệu quản lý...
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900">Quản lý Sự kiện</h1>
                        <p className="text-gray-500 mt-1 uppercase text-xs tracking-widest font-bold">Organizer Dashboard</p>
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
                        <h2 className="text-2xl font-black mb-8">Thông tin sự kiện mới</h2>
                        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Tên sự kiện</label>
                                    <input 
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow-400"
                                        placeholder="Ví dụ: Concert Sơn Tùng M-TP"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Mô tả</label>
                                    <textarea 
                                        required
                                        rows="4"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow-400"
                                        placeholder="Nhập mô tả sự kiện..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 mb-2">Giá vé (TEST)</label>
                                        <input 
                                            required
                                            type="number" step="0.001"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow-400"
                                            placeholder="0.1"
                                            value={priceEth}
                                            onChange={e => setPriceEth(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-400 mb-2">Số lượng vé</label>
                                        <input 
                                            required
                                            type="number"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow-400"
                                            placeholder="100"
                                            value={totalTickets}
                                            onChange={e => setTotalTickets(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Thời gian</label>
                                    <input 
                                        required
                                        type="datetime-local"
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow-400"
                                        value={eventDate}
                                        onChange={e => setEventDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Địa điểm</label>
                                    <input 
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow-400"
                                        placeholder="Sân vận động Mỹ Đình"
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Thể loại sự kiện</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow-400"
                                        value={eventType}
                                        onChange={e => setEventType(e.target.value)}
                                    >
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
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Ảnh Banner (Thumbnail)</label>
                                    <input 
                                        type="file"
                                        accept="image/*"
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200"
                                        onChange={e => setBannerFile(e.target.files[0])}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-400 mb-2">Ảnh Chi tiết (16:9)</label>
                                    <input 
                                        type="file"
                                        accept="image/*"
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
                                        onChange={e => setDetailFile(e.target.files[0])}
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-100 text-red-600 rounded-2xl text-sm font-bold">
                                        {error}
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={creating}
                                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition mt-4 ${
                                        creating ? "bg-gray-300 text-gray-500" : "bg-black text-white hover:bg-gray-800"
                                    }`}
                                >
                                    {creating ? "Đang xử lý (vui lòng chờ)..." : "Xác nhận tạo sự kiện"}
                                </button>
                                <p className="text-[10px] text-center text-gray-400 italic">Lưu ý: Bạn sẽ cần ký 2 giao dịch (Upload & Blockchain)</p>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    {events.length === 0 ? (
                        <div className="bg-white rounded-[2.5rem] p-20 text-center text-gray-400 font-bold border-2 border-dashed border-gray-200">
                            Bạn chưa tạo sự kiện nào.
                        </div>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="bg-white rounded-3xl p-6 shadow-sm flex items-center gap-6 border border-white hover:border-yellow-400 transition">
                                <img src={event.bannerImage} alt="" className="w-32 h-32 rounded-2xl object-cover" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-black text-gray-900">{event.title}</h3>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            event.Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {event.Status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm mt-1">
                                        {event.location} • {event.date}
                                    </p>
                                    <div className="flex gap-10 mt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase">Đã bán</p>
                                            <p className="font-bold text-gray-800">{event.TicketsSold} / {event.TotalTickets}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase">Doanh thu</p>
                                            <p className="font-bold text-green-600">{(event.TicketsSold * parseFloat(event.priceEth || 0)).toFixed(2)} TEST</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button className="bg-gray-50 text-gray-900 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-100">Chỉnh sửa</button>
                                    <button className="bg-red-50 text-red-600 px-6 py-2 rounded-xl text-sm font-bold hover:bg-red-100">Hủy bỏ</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
