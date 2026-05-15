import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import normalizeEvent from "../lib/normalizeEvent";
import { fetchIPFSMetadata, parseEventMetadata } from "../lib/ipfs";
import { buyTicketOnChain } from "../lib/web3";
import { useAuth } from "../context/AuthContext";

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

        // Check if event has ticket types
        const ticketTypeId = event.TicketTypes?.[0]?.TicketTypeID;
        if (!ticketTypeId) {
            alert("Sự kiện này hiện chưa có loại vé để mua. Vui lòng liên hệ ban tổ chức.");
            return;
        }

        setBuying(true);
        setBuyError(null);

        try {
            // Price in Wei is needed for the contract call
            // event.price is stored as a string or decimal in the backend
            let priceWei;
            try {
                priceWei = window.BigInt(event.price || "0");
            } catch (e) {
                console.error("Invalid price for BigInt:", event.price);
                priceWei = 0n;
            }
            
            // 1. Giao dịch trên Blockchain
            const txHash = await buyTicketOnChain(event.id, priceWei);
            
            // 2. Đồng bộ với Backend
            await api.post("/orders", {
                TicketTypeID: ticketTypeId,
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
    const displayImage = event.detailImage || event.bannerImage;
    const displayPriceEth = event.priceEth || null;

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6 flex flex-col md:flex-row gap-8">
                <div className="md:w-1/2">
                    <img
                        src={displayImage}
                        alt={displayTitle || "Event image"}
                        className="w-full rounded-xl object-cover aspect-video"
                    />
                </div>

                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{displayTitle}</h1>

                    {ipfsLoading && (
                        <p className="text-sm text-gray-400 mt-2 italic">Đang tải thông tin từ IPFS...</p>
                    )}

                    {ipfsError && (
                        <p className="text-sm text-red-500 mt-2">{ipfsError}</p>
                    )}

                    {displayDescription && (
                        <p className="text-gray-600 mt-4 leading-relaxed">{displayDescription}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-6 border-t pt-6">
                        {ipfsData?.organizer && (
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Tổ chức</p>
                                <p className="text-sm text-gray-800">{ipfsData.organizer}</p>
                            </div>
                        )}

                        {displayLocation && (
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Địa điểm</p>
                                <p className="text-sm text-gray-800">{displayLocation}</p>
                            </div>
                        )}

                        {ipfsData?.eventDate && (
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Ngày diễn ra</p>
                                <p className="text-sm text-gray-800">{ipfsData.eventDate}</p>
                            </div>
                        )}

                        {displayCategory && (
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Thể loại</p>
                                <p className="text-sm text-gray-800">{displayCategory}</p>
                            </div>
                        )}
                    </div>

                    {ipfsData?.tags && ipfsData.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {ipfsData.tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-2 py-1 rounded"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 p-6 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Giá vé</p>
                                <p className="text-2xl font-black text-red-600">
                                    {displayPriceEth ? `${displayPriceEth} TEST` : "Giá sẽ cập nhật sớm"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Còn lại</p>
                                <p className="text-xl font-bold text-gray-800">{event.remainingTickets ?? event.totalTickets}</p>
                            </div>
                        </div>

                        {buyError && (
                            <div className="mt-4 p-3 bg-red-100 text-red-600 text-sm rounded-lg">
                                {buyError}
                            </div>
                        )}

                        {user && event && user.userId === event.CreatedBy ? (
                            <button
                                onClick={() => navigate("/admin")}
                                className="mt-6 w-full py-4 rounded-xl font-black uppercase tracking-widest transition shadow-lg bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Quản lý sự kiện của tôi
                            </button>
                        ) : (
                            <button
                                onClick={handleBuy}
                                disabled={buying || !displayPriceEth}
                                className={`mt-6 w-full py-4 rounded-xl font-black uppercase tracking-widest transition shadow-lg ${
                                    buying || !displayPriceEth 
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                                    : "bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-[1.02] active:scale-[0.98]"
                                }`}
                            >
                                {buying ? "Đang xử lý..." : "Mua vé ngay"}
                            </button>
                        )}
                    </div>

                    {event.metaURL && (
                        <p className="mt-6 text-[10px] text-gray-300 break-all font-mono">
                            IPFS_CID: {event.metaURL}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}