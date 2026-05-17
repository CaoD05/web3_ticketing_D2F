import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { checkInTicketOnChain, refundTicketOnChain } from "../lib/web3";
import { cidToGatewayUrl } from "../lib/ipfs";

export default function MyTickets() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleRefund = async (ticketId, tokenId) => {
        if (!tokenId) return alert("Vé chưa đồng bộ.");
        if (!window.confirm("Bạn muốn trả vé? Bạn sẽ nhận lại 80% giá vé ban đầu và vé này sẽ bị hủy.")) return;

        try {
            await refundTicketOnChain(tokenId);
            alert("Hoàn tiền thành công!");
            window.location.reload();
        } catch (err) {
            alert("Lỗi hoàn tiền: " + (err.message || "Giao dịch thất bại"));
        }
    };


    const handleCheckIn = async (ticketId, tokenId) => {
        if (!tokenId) {
            alert("Vé này chưa có TokenID (đang chờ đồng bộ). Vui lòng thử lại sau.");
            return;
        }

        if (!window.confirm("Bạn có chắc chắn muốn Check-In vé này? Hành động này sẽ đánh dấu vé đã sử dụng trên blockchain.")) {
            return;
        }

        try {
            await checkInTicketOnChain(tokenId);
            alert("Check-In thành công! Vui lòng chờ vài phút để hệ thống cập nhật.");
            // Reload to update local state
            window.location.reload();
        } catch (err) {
            console.error("Check-In error:", err);
            alert("Lỗi Check-In: " + (err.message || "Giao dịch thất bại"));
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate("/login");
            return;
        }

        if (!user.walletAddress) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        
        api.get(`/tickets/my-tickets?wallet=${user.walletAddress}`)
            .then(res => {
                setTickets(res.data?.data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch tickets error:", err);
                setError("Không thể tải danh sách vé.");
                setLoading(false);
            });
    }, [user, authLoading, navigate]);

    if (authLoading || loading) {
        return (
            <div className="bg-gray-100 min-h-screen p-10 flex items-center justify-center">
                <div className="text-gray-600 text-lg">Đang tải vé của bạn...</div>
            </div>
        );
    }

    if (!user.walletAddress) {
        return (
            <div className="bg-gray-100 min-h-screen p-10 flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-gray-800">Bạn chưa kết nối ví</h2>
                <p className="text-gray-500 mt-2">Vui lòng kết nối MetaMask để xem vé đã mua.</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 bg-yellow-400 px-6 py-2 rounded-lg font-bold"
                >
                    Kiểm tra lại
                </button>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-black text-gray-900 mb-8">Vé của tôi</h1>

                {error && (
                    <div className="bg-red-100 text-red-600 p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {tickets.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center shadow-sm">
                        <div className="text-6xl mb-4">🎫</div>
                        <h2 className="text-xl font-bold text-gray-800">Bạn chưa có vé nào</h2>
                        <p className="text-gray-500 mt-2">Hãy khám phá các sự kiện và sở hữu vé đầu tiên của bạn!</p>
                        <button 
                            onClick={() => navigate("/events")}
                            className="mt-8 bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition"
                        >
                            Khám phá sự kiện
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map((ticket) => (
                            <div key={ticket.TicketID} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition group">
                                {/* Event Image Header */}
                                <div className="h-40 overflow-hidden relative">
                                    <img 
                                        src={cidToGatewayUrl(ticket.BannerURL || ticket.DetailURL)} 
                                        alt={ticket.EventName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                                        <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                            Token ID: {ticket.TokenID}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-xl font-bold text-gray-900 line-clamp-1">{ticket.EventName || "Sự kiện"}</h2>
                                        {ticket.IsUsed && (
                                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                                Đã sử dụng
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1 italic">
                                        {(() => {
                                            if (!ticket.EventDate) return "Thời gian chưa cập nhật";
                                            const d = new Date(ticket.EventDate);
                                            if (isNaN(d.getTime())) return "Thời gian chưa cập nhật";
                                            return d.toLocaleDateString("vi-VN", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric"
                                            });
                                        })()}
                                    </p>

                                    <div className="mt-6 pt-6 border-t border-dashed flex flex-col items-center">
                                        {/* Simplified QR Placeholder */}
                                        <div className="w-32 h-32 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-gray-100 mb-4 group-hover:scale-110 transition duration-500">
                                            <div className="text-gray-200">
                                                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M3 3h4v4H3V3zm14 0h4v4h-4V3zM3 17h4v4H3v-4zm14 0h4v4h-4v-4zM8 3h8v2H8V3zM3 8h2v8H3V8zm16 0h2v8h-2V8zM8 19h8v2H8v-2zM8 8h8v8H8V8z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-mono">HASH: {ticket.TransactionHash?.substring(0, 16)}...</p>
                                    </div>

                                    <div className="mt-6 grid grid-cols-2 gap-3">
                                        {ticket.IsUsed ? (
                                            <button disabled className="col-span-2 py-2 text-sm font-bold bg-gray-100 text-gray-400 rounded-xl cursor-not-allowed">
                                                Đã sử dụng
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => handleCheckIn(ticket.TicketID, ticket.TokenID)}
                                                    className="py-2 text-sm font-bold bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
                                                >
                                                    Check-In
                                                </button>
                                                <button 
                                                    onClick={() => handleRefund(ticket.TicketID, ticket.TokenID)}
                                                    className="py-2 text-sm font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                                                >
                                                    Hoàn vé
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
