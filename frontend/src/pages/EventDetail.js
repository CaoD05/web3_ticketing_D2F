import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import normalizeEvent from "../lib/normalizeEvent";
import { fetchIPFSMetadata, parseEventMetadata } from "../lib/ipfs";
import { buyTicketOnChain } from "../lib/web3";
import { useAuth } from "../context/AuthContext";

const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80";

function formatDate(value) {
    if (!value) return "Chưa xác định";
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    } catch (e) {
        return value;
    }
}

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [ipfsData, setIpfsData] = useState(null);
    const [ipfsLoading, setIpfsLoading] = useState(false);
    const [ipfsError, setIpfsError] = useState(null);
    const [buying, setBuying] = useState(false);
    const [buyError, setBuyError] = useState(null);

    // Fetch event details from backend
    useEffect(() => {
        api.get(`/events/${id}`)
            .then(res => setEvent(normalizeEvent(res.data?.data || null)))
            .catch(() => setEvent(null));
    }, [id]);

    // Fetch IPFS metadata if metaURL exists
    useEffect(() => {
        if (!event?.metaURL) {
            setIpfsData(null);
            return;
        }

        setIpfsLoading(true);
        setIpfsError(null);

        (async () => {
            try {
                const metadata = await fetchIPFSMetadata(event.metaURL);
                if (metadata) {
                    const parsed = parseEventMetadata(metadata);
                    setIpfsData(parsed);
                } else {
                    setIpfsError("Không thể tải dữ liệu từ IPFS");
                }
            } catch (err) {
                console.error("IPFS fetch error:", err);
                setIpfsError("Lỗi khi tải dữ liệu từ IPFS");
            } finally {
                setIpfsLoading(false);
            }
        })();
    }, [event?.metaURL]);

    const handleBuy = async () => {
        if (!user) {
            navigate("/login");
            return;
        }

        if (!user.walletAddress) {
            alert("Vui lòng kết nối ví MetaMask trước khi mua vé!");
            return;
        }

        // AUTO-SELECT SINGLE TICKET TYPE
        // We find the 'Standard' type or just the first one available
        const ticketType = event.TicketTypes?.find(t => t.TypeName === "Standard") || event.TicketTypes?.[0];
        
        if (!ticketType) {
            alert("Đang đồng bộ loại vé. Vui lòng thử lại sau vài giây.");
            return;
        }

        if (event.contractEventId === null) {
            alert("Sự kiện này chưa được kích hoạt trên Blockchain. Vui lòng thử lại sau.");
            return;
        }

        setBuying(true);
        setBuyError(null);

        try {
            // Price in Wei is needed for the contract call
            let priceWei;
            try {
                // event.price is normalizedPriceEth, but we need Wei
                // event.Price from DB is Decimal, normalizeEvent puts it in priceWei
                priceWei = window.BigInt(event.priceWei || "0");
            } catch (e) {
                console.error("Invalid price for BigInt:", event.priceWei);
                priceWei = 0n;
            }
            
            // 1. Giao dịch trên Blockchain
            const txHash = await buyTicketOnChain(event.contractEventId, priceWei);
            
            // 2. Đồng bộ với Backend (Tạo pending order)
            await api.post("/orders", {
                TicketTypeID: ticketType.TicketTypeID,
                Quantity: 1,
                TxHash: txHash
            });

            alert(`Mua vé thành công! Transaction Hash: ${txHash}`);
            navigate("/my-tickets");
        } catch (err) {
            console.error("Purchase error:", err);
            setBuyError(err.response?.data?.message || err.message || "Giao dịch thất bại");
        } finally {
            setBuying(false);
        }
    };

    if (!event) {
        return (
            <div className="bg-gray-100 min-h-screen p-10 flex items-center justify-center">
                <div className="text-gray-600 text-lg">Đang tải sự kiện...</div>
            </div>
        );
    }

    // Use IPFS data if available, otherwise fall back to event data
    const displayTitle = ipfsData?.title || event.title;
    const displayDescription = ipfsData?.description || event.description;
    const displayLocation = ipfsData?.location || event.location;
    const displayCategory = ipfsData?.category || event.category;
    
    // IMAGE PRIORITY:
    // 1. event.detailImage (Database specific detail - TRUST THIS FIRST)
    // 2. event.bannerImage (Database fallback)
    // 3. ipfsData.image (Legacy fallback from IPFS)
    const detailImage = 
        event.detailImage || 
        event.bannerImage || 
        ipfsData?.image || 
        FALLBACK_EVENT_IMAGE;

    const bannerImage = 
        event.bannerImage || 
        detailImage;

    const displayPriceEth = event.priceEth || ipfsData?.price || null;

    // Compute ticket availability: Available = TotalTickets - TicketsSold
    const totalTickets = Number(event.TotalTickets ?? event.totalTickets ?? event.totalTickets ?? 0);
    const usedTickets = Number(event.TicketsSold ?? event.ticketsSold ?? event.Sold ?? event.sold ?? 0);
    const availableTickets = Math.max(0, totalTickets - usedTickets);

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: Detail Image & Info */}
                    <div className="md:w-1/2 space-y-6">
                        <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-gray-100 p-2">
                             <img
                                src={detailImage}
                                alt="Event Detail"
                                className="w-full rounded-[1.5rem] object-cover aspect-video"
                            />
                        </div>
                        
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                             <h2 className="text-xl font-black mb-4 uppercase tracking-wider text-gray-900">Mô tả sự kiện</h2>
                             {displayDescription && (
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{displayDescription}</p>
                             )}
                             {!displayDescription && (
                                <p className="text-gray-400 italic">Chưa có mô tả chi tiết cho sự kiện này.</p>
                             )}
                        </div>
                    </div>

                    {/* Right: Ticket & Stats */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                            <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">{displayTitle}</h1>
                            <h2 className="text-sm font-bold mb-6 uppercase tracking-wider text-gray-400 border-b pb-4">Chi tiết vé</h2>
                            
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                {displayLocation && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Địa điểm</p>
                                        <p className="text-sm font-bold text-gray-800">{displayLocation}</p>
                                    </div>
                                )}

                                {displayCategory && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Thể loại</p>
                                        <p className="text-sm font-bold text-gray-800">{displayCategory}</p>
                                    </div>
                                )}

                                {ipfsData?.eventDate && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Ngày diễn ra</p>
                                        <p className="text-sm font-bold text-gray-800">{formatDate(ipfsData.eventDate)}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Giá vé</p>
                                    <p className="text-3xl font-black text-red-600 italic">TEST</p>
                                    </div>

                                    {/* Ticket Availability: Total - Used */}
                                    <div className="mt-4">
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Ticket Availability</p>
                                    <p className="text-sm font-bold text-gray-800">{availableTickets} <span className="text-xs text-gray-400 font-normal">vé</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Sẵn có</p>
                                        <p className="text-2xl font-black text-gray-900">{event.remainingTickets ?? event.totalTickets} <span className="text-xs text-gray-400 font-normal">vé</span></p>
                                    </div>
                                </div>

                                {buyError && (
                                    <div className="mt-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
                                        ⚠️ {buyError}
                                    </div>
                                )}

                                {user && event && user.userId === event.CreatedBy && user.role === 'organizer' && (
                                    <button
                                        onClick={() => navigate("/organizer")}
                                        className="mt-8 w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition shadow-xl bg-gray-900 text-white hover:bg-black hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Quản lý sự kiện
                                    </button>
                                )}

                                {user && user.role === 'admin' && (
                                    <button
                                        onClick={() => navigate("/admin")}
                                        className="mt-8 w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition shadow-xl bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Quản trị hệ thống
                                    </button>
                                )}

                                {(!user || (user.userId !== event.CreatedBy && user.role !== 'admin')) && (
                                    <button
                                        onClick={handleBuy}
                                        disabled={buying || !displayPriceEth}
                                        className={`mt-8 w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition shadow-xl ${
                                            buying || !displayPriceEth 
                                            ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                                            : "bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98]"
                                        }`}
                                    >
                                        {buying ? "Đang xử lý..." : "Mua vé ngay"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Additional Info Section */}
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                            <h2 className="text-sm font-black mb-4 uppercase tracking-widest text-gray-400">Thông tin kỹ thuật</h2>
                            <div className="space-y-4">
                                {event.contractEventId !== null && (
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-gray-300 mb-1">Smart Contract Address</p>
                                        <p className="text-[10px] font-mono text-blue-500 break-all bg-blue-50 p-2 rounded-lg border border-blue-100">
                                            {event.ContractAddress || "Chưa đồng bộ"}
                                        </p>
                                    </div>
                                )}
                                {event.metaURL && (
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-gray-300 mb-1">IPFS Metadata CID</p>
                                        <p className="text-[10px] font-mono text-gray-500 break-all bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            {event.metaURL}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}