import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="sticky top-0 z-50 bg-black text-white px-8 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-yellow-400">
                U-Ticket
            </Link>

            <div className="flex gap-6 items-center">
                <Link to="/events" className="hover:text-yellow-400">Sự kiện</Link>
                
                {user ? (
                    <>
                        <span className="text-gray-300">{user.fullName || user.email}</span>
                        <button 
                            onClick={handleLogout}
                            className="text-yellow-400 hover:text-yellow-300"
                        >
                            Đăng xuất
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/auth/login" className="hover:text-yellow-400">Đăng nhập</Link>
                        <Link to="/auth/register" className="hover:text-yellow-400">Đăng ký</Link>
                    </>
                )}
            </div>
        </div>
    );
}