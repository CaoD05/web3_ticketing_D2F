import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <div className="sticky top-0 z-50 bg-black text-white px-8 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-yellow-400">
                U-Ticket
            </Link>

            <div className="flex gap-6 items-center">
                <Link to="/events" className="hover:text-yellow-400">Sự kiện</Link>
                <Link to="/auth/login" className="hover:text-yellow-400">Đăng nhập</Link>
                <Link to="/auth/register" className="hover:text-yellow-400">Đăng ký</Link>
            </div>
        </div>
    );
}