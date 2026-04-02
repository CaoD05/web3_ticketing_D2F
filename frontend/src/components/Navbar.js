import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <div className="bg-black text-white px-8 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-yellow-400">
                Ticket
            </Link>

            <div className="flex gap-6 items-center">
                <Link to="/" className="hover:text-yellow-400">Sự kiện</Link>
                <Link to="/cart" className="hover:text-yellow-400">Giỏ hàng</Link>
                <Link to="/login" className="hover:text-yellow-400">Đăng nhập</Link>

                <button className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-semibold hover:bg-yellow-300">
                    Đăng ký
                </button>
            </div>
        </div>
    );
}