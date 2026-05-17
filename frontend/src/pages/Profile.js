import { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changing, setChanging] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const handleChange = async (e) => {
        e.preventDefault();
        setMsg({ type: "", text: "" });

        if (newPassword !== confirmPassword) {
            setMsg({ type: "error", text: "Mật khẩu mới không khớp." });
            return;
        }

        if (!currentPassword || !newPassword) {
            setMsg({ type: "error", text: "Vui lòng điền đầy đủ thông tin." });
            return;
        }

        setChanging(true);
        try {
            const res = await api.put("/auth/change-password", {
                currentPassword,
                newPassword
            });

            if (res.data && res.data.ok) {
                setMsg({ type: "success", text: "Đổi mật khẩu thành công." });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setMsg({ type: "error", text: res.data?.message || "Không thể đổi mật khẩu." });
            }
        } catch (err) {
            console.error("Change password error:", err);
            setMsg({ type: "error", text: err.response?.data?.message || "Lỗi khi đổi mật khẩu." });
        } finally {
            setChanging(false);
        }
    };

    return (
        <form onSubmit={handleChange} className="space-y-4">
            <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Mật khẩu hiện tại</label>
                <input
                    type="password"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-yellow-400"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Mật khẩu mới</label>
                <input
                    type="password"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-yellow-400"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Xác nhận mật khẩu mới</label>
                <input
                    type="password"
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-yellow-400"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </div>

            {msg.text && (
                <div className={`p-4 rounded-2xl text-sm font-bold text-center ${msg.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {msg.text}
                </div>
            )}

            <button
                type="submit"
                disabled={changing}
                className={`w-full py-3 rounded-2xl font-black uppercase tracking-[0.2em] shadow transition mt-4 ${changing ? "bg-gray-300 text-gray-500" : "bg-black text-white hover:bg-gray-800"}`}>
                {changing ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
        </form>
    );
}


export default function Profile() {
    const { user, login: updateAuthContext, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate("/login");
            return;
        }

        setFullName(user.fullName || "");
        setEmail(user.email || "");
    }, [user, authLoading, navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setMessage({ type: "", text: "" });

        try {
            const res = await api.put("/me", {
                FullName: fullName,
                Email: email
            });

            if (res.data.ok) {
                // Get current session to preserve token and remember state
                const storageType = localStorage.getItem("uticket_auth_storage") || "session";
                const remember = storageType === "local";
                const token = localStorage.getItem("uticket_token") || sessionStorage.getItem("uticket_token");

                const updatedUser = {
                    ...user,
                    fullName: res.data.data.FullName,
                    email: res.data.data.Email
                };
                
                // updateAuthContext(token, userData, remember)
                updateAuthContext(token, updatedUser, remember);
                
                setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
            }
        } catch (err) {
            console.error("Update profile error:", err);
            setMessage({ 
                type: "error", 
                text: err.response?.data?.message || "Không thể cập nhật thông tin." 
            });
        } finally {
            setUpdating(false);
        }
    };

    if (authLoading) {
        return (
            <div className="bg-gray-100 min-h-screen p-10 flex items-center justify-center font-bold">
                Đang tải thông tin...
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen p-10">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-black text-gray-900 mb-8 text-center">Tài khoản của tôi</h1>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-3xl font-black text-black mb-4">
                            {(user?.fullName || user?.email || "?")[0].toUpperCase()}
                        </div>
                        <p className="text-xs font-black uppercase text-gray-400 tracking-widest">
                            {user?.role === 'organizer' ? 'Organizer' : user?.role === 'admin' ? 'Administrator' : 'User'}
                        </p>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Họ và tên</label>
                            <input 
                                required
                                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-yellow-400 font-bold"
                                placeholder="Nhập họ và tên của bạn"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Email</label>
                            <input 
                                type="email"
                                required
                                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-yellow-400 font-bold"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">Địa chỉ ví (Chỉ đọc)</label>
                            <div className="w-full bg-gray-100 border-none rounded-2xl px-6 py-4 font-mono text-sm text-gray-500 break-all">
                                {user?.walletAddress || "Chưa kết nối ví"}
                            </div>
                        </div>

                        {message.text && (
                            <div className={`p-4 rounded-2xl text-sm font-bold text-center ${
                                message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                                {message.text}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={updating}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition mt-4 ${
                                updating ? "bg-gray-300 text-gray-500" : "bg-black text-white hover:bg-gray-800"
                            }`}
                        >
                            {updating ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </form>
                </div>

                {/* Change Password Section */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 mt-8">
                    <h2 className="text-2xl font-black mb-6 text-center">Đổi mật khẩu</h2>
                    <ChangePasswordForm />
                </div>
                
                <div className="mt-8 text-center">
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-gray-400 hover:text-gray-600 font-bold uppercase text-xs tracking-widest transition"
                    >
                        ← Quay lại
                    </button>
                </div>
            </div>
        </div>
    );
}
